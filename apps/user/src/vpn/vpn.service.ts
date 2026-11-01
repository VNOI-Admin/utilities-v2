import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import type { OnModuleInit } from '@nestjs/common';
import { BadRequestException, ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Role } from '@libs/common/decorators/role.decorator';
import { VpnConfig } from './entities/vpnConfig.entity';

const USABLE_GUEST = {
  role: Role.GUEST,
  vpnIpAddress: { $ne: null },
  'keyPair.privateKey': { $ne: null },
  'keyPair.publicKey': { $ne: null },
};

@Injectable()
export class VpnService implements OnModuleInit {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private configService: ConfigService,
  ) {}

  onModuleInit() {}

  async getWireGuardConfig(caller: string, username?: string | undefined): Promise<VpnConfig> {
    const reqCaller = await this.userModel.findOne({ username: caller }).lean();

    const user = username ? await this.userModel.findOne({ username }) : reqCaller;

    if (!reqCaller || !user) {
      throw new BadRequestException('User not found');
    }

    if (reqCaller.role !== Role.ADMIN && reqCaller.username !== user.username) {
      throw new ForbiddenException("You are not authorized to generate this user's WireGuard configuration");
    }

    if (!user.keyPair || !user.vpnIpAddress) {
      throw new BadRequestException(`User ${caller} does not have a key pair or VPN IP address`);
    }

    return new VpnConfig({
      config: await this.generateWireGuardUserConfig(user as UserDocument),
      apiKey: user.apiKey ?? null,
    });
  }

  async getWireGuardGuestConfig(machine: string): Promise<VpnConfig> {
    const user = (await this.boundGuest(machine)) ?? (await this.claimGuest(machine));
    if (!user) {
      throw new ServiceUnavailableException('No available guest VPN accounts.');
    }

    return new VpnConfig({
      config: await this.generateWireGuardUserConfig(user as UserDocument),
      apiKey: null,
    });
  }

  private boundGuest(machine: string) {
    return this.userModel.findOneAndUpdate(
      { ...USABLE_GUEST, machine },
      { $set: { isActive: true, 'machineUsage.lastReportedAt': new Date() } },
      { new: true },
    );
  }

  private async claimGuest(machine: string) {
    const claim = (filter: Record<string, unknown>) =>
      this.userModel.findOneAndUpdate(
        { ...USABLE_GUEST, isActive: false, ...filter },
        { $set: { isActive: true, machine, 'machineUsage.lastReportedAt': new Date() } },
        { new: true, sort: { username: 1 } },
      );

    try {
      return (await claim({ machine: null })) ?? (await claim({}));
    } catch (error) {
      // machine is unique: a concurrent request from this same machine bound an account first.
      if ((error as { code?: number }).code === 11000) {
        return this.boundGuest(machine);
      }
      throw error;
    }
  }

  async generateWireGuardUserConfig(user: UserDocument): Promise<string> {
    const coreEndpoint = `${this.configService.get('WG_CORE_PUBLIC_IP')}:${this.configService.get('WG_LISTEN_PORT')}`;

    const wireGuardConfig = `[Interface]
PrivateKey = ${user.keyPair.privateKey}
Address = ${user.vpnIpAddress}/32
ListenPort = ${this.configService.get('WG_LISTEN_PORT')}
PostUp = ip link set mtu ${this.configService.get('WG_MTU')} dev %i

# Core
[Peer]
PublicKey = ${this.configService.get('WG_CORE_PUBLIC_KEY')}
AllowedIPs = ${this.configService.get('WG_CORE_ALLOWED_IPS')}
Endpoint = ${coreEndpoint}
PersistentKeepalive = ${this.configService.get('WG_PERSISTENT_KEEPALIVE')}
`;

    return wireGuardConfig;
  }
}
