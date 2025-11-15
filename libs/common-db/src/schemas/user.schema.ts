import { Role } from '@libs/common/decorators/role.decorator';
import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { type Document } from 'mongoose';

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

export type Participation = {
  contest: string;
  contest_username?: string;
};

@Schema()
export class User {
  @Prop({ required: true, unique: true })
  username!: string;

  @Prop({ required: false })
  fullName!: string;

  @Prop({ required: true })
  password!: string;

  @Prop()
  refreshToken?: string;

  @Prop({ required: true, type: String, default: Role.CONTESTANT })
  role!: Role;

  // Allow null for several documents. For non-null, unique is enforced.
  @Prop({ unique: true, sparse: true })
  vpnIpAddress!: string;

  @Prop({ required: true, default: true })
  isActive!: boolean;

  @Prop(
    raw({
      publicKey: { type: String, default: null },
      privateKey: { type: String, default: null },
    }),
  )
  keyPair!: KeyPairType;

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
  machineUsage!: MachineUsage;

  @Prop({ required: false })
  group!: string;

  @Prop({
    required: false,
    type: [
      {
        contest: { type: String },
        contest_username: { type: String, required: false },
      },
    ],
    default: [],
  })
  participations!: Participation[];
}

export const UserSchema = SchemaFactory.createForClass(User);
