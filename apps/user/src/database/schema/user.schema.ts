import type { ConfigService } from '@nestjs/config';
import { Prop, raw,Schema, SchemaFactory } from '@nestjs/mongoose';
import * as argon2 from 'argon2';
import * as ip from 'ip';
import { type Document, SchemaTypes, Types } from 'mongoose';

import { generateKeyPair } from '../../utils/keygen';

export type UserDocument = User & Document;

export type KeyPairType = {
  publicKey: string;
  privateKey: string;
};

export type Role = 'admin' | 'coach' | 'user';

export type MachineUsage = {
  cpu: number;
  memory: number;
  disk: number;
  ping: number;
  isOnline: boolean;
  lastReportedAt: Date;
}

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

  @Prop({ required: true, default: 'user' })
  role: Role;

  // Allow null for several documents. For non-null, unique is enforced.
  @Prop({ unique: true, sparse: true })
  vpnIpAddress: string;

  @Prop({ type: String, default: null })
  sessionId: string;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop(
    raw({
      publicKey: { type: String, default: null },
      privateKey: { type: String, default: null },
    }),
  )
  keyPair: KeyPairType;

  @Prop(raw({
    cpu: { type: Number, default: 0 },
    memory: { type: Number, default: 0 },
    disk: { type: Number, default: 0 },
    ping: { type: Number, default: 0 },
    isOnline: { type: Boolean, default: false },
    lastReportedAt: { type: Date, default: null },
  }))
  machineUsage: MachineUsage;

  // Belong to one group
  @Prop({ type: SchemaTypes.ObjectId, ref: 'Group' })
  group: Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);

export function buildUserSchema(configService: ConfigService) {
  const schema = UserSchema;
  schema.pre('validate', async function (next) {
    if (this.isModified('password')) {
      this.password = await argon2.hash(this.password);
    }

    // Generate VPN IP address and key pair. Only generate for new users.
    if (this.isNew && !this.vpnIpAddress) {
      console.log('Generating VPN IP address and key pair...');
      const sameTypeUserCount = await this.model(
        User.name,
      ).countDocuments({
        role: this.role,
        vpnIpAddress: { $ne: null },
      });

      let vpnBaseSubnet: number;

      switch (this.role) {
        case 'user':
          vpnBaseSubnet = ip.toLong(
            configService.get('WG_USER_BASE_SUBNET'),
          );
          break;
        case 'coach':
          vpnBaseSubnet = ip.toLong(
            configService.get('WG_COACH_BASE_SUBNET'),
          );
          break;
        case 'admin':
          vpnBaseSubnet = ip.toLong(
            configService.get('WG_ADMIN_BASE_SUBNET'),
          );
          break;
        default:
          throw new Error('Invalid role');
      }

      this.vpnIpAddress = ip.fromLong(
        vpnBaseSubnet + sameTypeUserCount + 1,
      );

      this.keyPair = generateKeyPair();
    }

    next();
  });
}
