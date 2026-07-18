import { WgPortalApi, type WgPortalPeer } from '@libs/api/wg-portal';
import { User, type UserDocument, setUserVpnSyncQueue } from '@libs/common-db/schemas/user.schema';
import { Role } from '@libs/common/decorators/role.decorator';
import { getErrorMessage } from '@libs/common/helper/error';
import { VPN_ENABLED_ROLES, roleHasVpn } from '@libs/common/helper/vpn';
import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Queue } from 'bullmq';
import { Model } from 'mongoose';

type DesiredVpnPeerState = {
  username: string;
  publicKey: string;
  privateKey: string;
  vpnIpAddress: string;
  disabled: boolean;
};

const VPN_USER_SYNC_QUEUE = 'vpn-user-sync';
const VPN_USER_SYNC_JOB_NAME = 'sync-user-vpn';

@Injectable()
export class VpnSyncService {
  private readonly interfaceId: string;
  private readonly wgPortalApi: WgPortalApi;

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectQueue(VPN_USER_SYNC_QUEUE)
    private readonly vpnUserSyncQueue: Queue,
    private readonly configService: ConfigService,
  ) {
    this.interfaceId = this.configService.get<string>('WG_PORTAL_INTERFACE_ID') ?? 'wg0';
    this.wgPortalApi = new WgPortalApi({
      baseURL: this.requireConfig('WG_PORTAL_BASE_URL'),
      username: this.requireConfig('WG_PORTAL_CORE_ADMIN_USER'),
      password: this.requireConfig('WG_PORTAL_CORE_ADMIN_API_TOKEN'),
    });
    setUserVpnSyncQueue((usernames) => this.queueUserSyncMany(usernames));
  }

  async queueUserSync(username: string): Promise<void> {
    if (!username) {
      return;
    }

    await this.vpnUserSyncQueue.add(
      VPN_USER_SYNC_JOB_NAME,
      {
        username,
      },
      {
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  }

  async queueUserSyncMany(usernames: string[]): Promise<void> {
    const uniqueUsernames = [...new Set(usernames.filter(Boolean))];
    await Promise.all(uniqueUsernames.map((username) => this.queueUserSync(username)));
  }

  async queueAllVpnUsers(): Promise<{ count: number }> {
    try {
      const users = await this.userModel
        .find({
          $or: [
            { role: { $in: [...VPN_ENABLED_ROLES] } },
            { vpnIpAddress: { $ne: null } },
            { 'keyPair.publicKey': { $ne: null } },
            { 'keyPair.privateKey': { $ne: null } },
          ],
        })
        .select('username')
        .lean()
        .exec();

      const usernames = users.map((user) => user.username);
      await this.queueUserSyncMany(usernames);

      return { count: usernames.length };
    } catch (error) {
      throw new BadRequestException(`Unable to queue VPN sync: ${getErrorMessage(error)}`);
    }
  }

  async syncUser(username: string): Promise<void> {
    const [user, peers] = await Promise.all([
      this.userModel.findOne({ username }).lean().exec(),
      this.wgPortalApi.getPeersByInterface(this.interfaceId),
    ]);

    const userPeers = peers.filter((peer) => peer.UserIdentifier === username);
    const desiredPeer = this.getDesiredPeer(user);

    if (!desiredPeer) {
      await this.deletePeers(userPeers);
      return;
    }

    const conflictingPeer = peers.find(
      (peer) => peer.Identifier === desiredPeer.publicKey && peer.UserIdentifier !== username,
    );
    if (conflictingPeer) {
      throw new Error(`Public key conflict for user ${username}`);
    }

    const stalePeers = userPeers.filter((peer) => peer.Identifier !== desiredPeer.publicKey);
    await this.deletePeers(stalePeers);

    const existingPeer = userPeers.find((peer) => peer.Identifier === desiredPeer.publicKey);
    const peer = existingPeer ?? (await this.wgPortalApi.preparePeer(this.interfaceId));
    const peerAddress = `${desiredPeer.vpnIpAddress}/32`;
    const nextPeer: WgPortalPeer = {
      ...peer,
      Identifier: desiredPeer.publicKey,
      DisplayName: desiredPeer.username,
      UserIdentifier: desiredPeer.username,
      InterfaceIdentifier: this.interfaceId,
      Disabled: desiredPeer.disabled,
      DisabledReason: '',
      Notes: 'Managed by utilities-v2 VPN sync',
      PresharedKey: '',
      PrivateKey: desiredPeer.privateKey,
      PublicKey: desiredPeer.publicKey,
      AllowedIPs: {
        ...peer.AllowedIPs,
        Value: [peerAddress],
      },
      Addresses: [peerAddress],
    };

    if (existingPeer) {
      await this.wgPortalApi.updatePeer(nextPeer.Identifier, nextPeer);
      return;
    }

    await this.wgPortalApi.createPeer(nextPeer);
  }

  private getDesiredPeer(
    user: Pick<UserDocument, 'username' | 'role' | 'isActive' | 'vpnIpAddress' | 'keyPair'> | null,
  ): DesiredVpnPeerState | null {
    if (!user || !roleHasVpn(user.role)) {
      return null;
    }

    const publicKey = user.keyPair?.publicKey ?? null;
    const privateKey = user.keyPair?.privateKey ?? null;
    if (!user.vpnIpAddress || !publicKey || !privateKey) {
      return null;
    }

    const disabled = user.role !== Role.GUEST && !user.isActive;

    return {
      username: user.username,
      publicKey,
      privateKey,
      vpnIpAddress: user.vpnIpAddress,
      disabled,
    };
  }

  private async deletePeers(peers: WgPortalPeer[]): Promise<void> {
    for (const peer of peers) {
      await this.wgPortalApi.deletePeer(peer.Identifier);
    }
  }

  private requireConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (value) {
      return value;
    }

    throw new Error(`Missing required config: ${key}`);
  }
}
