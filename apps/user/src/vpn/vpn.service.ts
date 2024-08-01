import { User, type UserDocument } from "@libs/common-db/schemas/user.schema";
import type { OnModuleInit } from "@nestjs/common";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { plainToInstance } from "class-transformer";
import { Model } from "mongoose";

import { VpnConfig } from "./entities/vpnConfig.entity";

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

    if (username) {
      user = await this.userModel.findOne({ username: username });
    } else {
      user = reqCaller;
    }

    if (!reqCaller || !user) {
      throw new BadRequestException("User not found");
    }

    if (reqCaller.role !== "admin" && reqCaller._id !== user._id) {
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

  async generateWireGuardUserConfig(user: UserDocument): Promise<string> {
    const coreEndpoint = `${this.configService.get("WG_CORE_PUBLIC_IP")}:${this.configService.get("WG_LISTEN_PORT")}`;

    const wireGuardConfig = `[Interface]
PrivateKey = ${user.keyPair.privateKey}
Address = ${user.vpnIpAddress}/32
ListenPort = ${this.configService.get("WG_LISTEN_PORT")}
PostUp = ip link set mtu 1300 dev %i

# Core
[Peer]
PublicKey = ${this.configService.get("WG_CORE_PUBLIC_KEY")}
AllowedIPs = ${this.configService.get("WG_CORE_ALLOWED_IPS")}
Endpoint = ${coreEndpoint}
PersistentKeepalive = 25
`;

    return wireGuardConfig;
  }
}
