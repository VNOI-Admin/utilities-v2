import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import type { OnModuleInit } from '@nestjs/common';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { Model } from 'mongoose';

import { VpnConfig } from './entities/vpnConfig.entity';

@Injectable()
export class VpnService implements OnModuleInit {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private configService: ConfigService,
  ) {}

  onModuleInit() {}

  async getWireGuardConfig(
    caller: string,
    username?: string | undefined,
  ): Promise<VpnConfig> {
    const reqCaller = await this.userModel.findById(caller);
    let user: UserDocument;

    if (username === 'core') {
      return await this.getWireGuardCoreConfig(caller);
    }

    if (username) {
      user = await this.userModel.findOne({ username: username });
    } else {
      user = reqCaller;
    }

    if (!reqCaller || !user) {
      throw new BadRequestException('User not found');
    }

    if (reqCaller.role !== 'admin' && reqCaller._id !== user._id) {
      throw new ForbiddenException(
        "You are not authorized to generate this user's WireGuard configuration",
      );
    }

    if (!user.keyPair || !user.vpnIpAddress) {
      // Throw runtime error
      throw new Error(
        `User ${username} does not have a key pair or VPN IP address`,
      );
    }

    const plain = {
      config: await this.generateWireGuardUserConfig(user),
    };

    return plainToInstance(VpnConfig, plain);
  }

  async getWireGuardCoreConfig(caller: string): Promise<VpnConfig> {
    const reqCaller = await this.userModel.findById(caller);

    if (!reqCaller) {
      throw new BadRequestException('User not found');
    }

    if (reqCaller.role !== 'admin') {
      throw new ForbiddenException(
        'You are not authorized to generate this WireGuard configuration',
      );
    }

    const plain = {
      config: await this.generateWireGuardCoreConfig(),
    };

    return plainToInstance(VpnConfig, plain);
  }

  async generateWireGuardCoreConfig(): Promise<string> {
    let wireGuardConfig = `[Interface]
PrivateKey = ${this.configService.get('WG_CORE_PRIVATE_KEY')}
Address = ${this.configService.get('WG_CORE_IP_ADDRESS')}/32
ListenPort = ${this.configService.get('WG_LISTEN_PORT')}
PostUp = iptables -w -t nat -A POSTROUTING -o eth0 -j MASQUERADE; ip6tables -w -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -w -t nat -D POSTROUTING -o eth0 -j MASQUERADE; ip6tables -w -t nat -D POSTROUTING -o eth0 -j MASQUERADE
`;

    const users = await this.userModel.find({
      keyPair: { $ne: null },
      vpnIpAddress: { $ne: null },
    });

    for (const user of users) {
      wireGuardConfig += `
# ${user.username}
[Peer]
PublicKey = ${user.keyPair.publicKey}
AllowedIPs = ${user.vpnIpAddress}/32
PersistentKeepalive = 25
`;
    }

    return wireGuardConfig;
  }

  async generateWireGuardUserConfig(user: UserDocument): Promise<string> {
    const coreEndpoint = `${this.configService.get('WG_CORE_PUBLIC_IP')}:${this.configService.get('WG_LISTEN_PORT')}`;

    const wireGuardConfig = `[Interface]
PrivateKey = ${user.keyPair.privateKey}
Address = ${user.vpnIpAddress}/32
ListenPort = ${this.configService.get('WG_LISTEN_PORT')}

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
