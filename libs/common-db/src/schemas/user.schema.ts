import { Role } from "@libs/common/decorators/role.decorator";
import { generateKeyPair } from "@libs/utils/crypto/keygen";
import type { ConfigService } from "@nestjs/config";
import { Prop, raw, Schema, SchemaFactory } from "@nestjs/mongoose";
import * as argon2 from "argon2";
import * as ip from "ip";
import type { Model } from "mongoose";
import { type Document, SchemaTypes } from "mongoose";
import { GroupDocument } from "./group.schema";

export type UserDocument = User & Document;

export type KeyPairType = {
  publicKey: string;
  privateKey: string;
};

export type MachineUsage = {
  cpu: number;
  memory: number;
  disk: number;
  ping: number;
  isOnline: boolean;
  lastReportedAt: Date;
};

@Schema()
export class User {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: false })
  fullName: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  refreshToken: string;

  @Prop({ required: true, type: String, default: Role.CONTESTANT })
  role: Role;

  // Allow null for several documents. For non-null, unique is enforced.
  @Prop({ unique: true, sparse: true })
  vpnIpAddress: string;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop(
    raw({
      publicKey: { type: String, default: null },
      privateKey: { type: String, default: null },
    }),
  )
  keyPair: KeyPairType;

  @Prop(
    raw({
      cpu: { type: Number, default: 0 },
      memory: { type: Number, default: 0 },
      disk: { type: Number, default: 0 },
      ping: { type: Number, default: 0 },
      isOnline: { type: Boolean, default: false },
      lastReportedAt: { type: Date, default: null },
    }),
  )
  machineUsage: MachineUsage;

  // Belong to one group
  @Prop({ type: SchemaTypes.ObjectId, ref: "Group" })
  group: GroupDocument;
}

export const UserSchema = SchemaFactory.createForClass(User);

export function buildUserSchema(configService: ConfigService) {
  const schema = UserSchema;
  schema.pre("validate", async function (next) {
    if (this.isModified("password")) {
      this.password = await argon2.hash(this.password);
    }

    // Generate VPN IP address and key pair. Only generate for new users.
    if ((this.isNew && !this.vpnIpAddress) || this.isModified("role")) {
      const users = await this.model<Model<UserDocument>>(User.name)
        .find({ role: this.role })
        .exec();

      let vpnBaseSubnet: number;

      switch (this.role) {
        case Role.CONTESTANT:
          vpnBaseSubnet = ip.toLong(
            configService.get("WG_CONTESTANT_BASE_SUBNET"),
          );
          break;
        case Role.COACH:
          vpnBaseSubnet = ip.toLong(configService.get("WG_COACH_BASE_SUBNET"));
          break;
        case Role.ADMIN:
          vpnBaseSubnet = ip.toLong(configService.get("WG_ADMIN_BASE_SUBNET"));
          break;
        default:
          throw new Error("Invalid role");
      }

      const ipAddresses = users.map((user) => ip.toLong(user.vpnIpAddress));

      for (let i = 1; i <= users.length + 1; i++) {
        if (!ipAddresses.includes(vpnBaseSubnet + i)) {
          const ipAddress = ip.fromLong(vpnBaseSubnet + i);
          this.vpnIpAddress = ipAddress;
          break;
        }
      }

      this.keyPair = generateKeyPair();
    }

    next();
  });
}
