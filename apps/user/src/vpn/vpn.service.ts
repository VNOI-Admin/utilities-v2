import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import type { OnModuleInit } from '@nestjs/common';
import { BadRequestException, ForbiddenException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Role } from '@libs/common/decorators/role.decorator';
import { VpnConfig } from './entities/vpnConfig.entity';

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
    });
  }

  async getWireGuardGuestConfig(): Promise<VpnConfig> {
    const now = new Date();

    // Atomically find a free guest account and mark it active
    // Sort by username to get the lowest numbered guest (guest_001, guest_002, etc.)
    const user = await this.userModel.findOneAndUpdate(
      {
        role: Role.GUEST,
        isActive: false,
        vpnIpAddress: { $ne: null },
        'keyPair.privateKey': { $ne: null },
        'keyPair.publicKey': { $ne: null },
      },
      {
        $set: {
          isActive: true,
          'machineUsage.lastReportedAt': now,
        },
      },
      {
        new: true,
        sort: { username: 1 } // Sort ascending to get the lowest numbered guest first
      }
    );

    if (!user) {
      throw new ServiceUnavailableException('No available guest VPN accounts.');
    }

    return new VpnConfig({
      config: await this.generateWireGuardUserConfig(user as UserDocument),
    });
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
