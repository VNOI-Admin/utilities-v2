import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import type { OnModuleInit } from '@nestjs/common';
import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
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

  async generateWireGuardUserConfig(user: UserDocument): Promise<string> {
    const coreEndpoint = `${this.configService.get('WG_CORE_PUBLIC_IP')}:${this.configService.get('WG_LISTEN_PORT')}`;

    const wireGuardConfig = `[Interface]
PrivateKey = ${user.keyPair.privateKey}
Address = ${user.vpnIpAddress}/32
ListenPort = ${this.configService.get('WG_LISTEN_PORT')}
PostUp = ip link set mtu 1300 dev %i

# Core
[Peer]
PublicKey = ${this.configService.get('WG_CORE_PUBLIC_KEY')}
AllowedIPs = ${this.configService.get('WG_CORE_ALLOWED_IPS')}
Endpoint = ${coreEndpoint}
PersistentKeepalive = 25
`;

    return wireGuardConfig;
  }
}
