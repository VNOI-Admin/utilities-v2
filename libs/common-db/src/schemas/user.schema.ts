import { Role } from '@libs/common/decorators/role.decorator';
import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { type Document } from 'mongoose';

export type UserDocument = User & Document;

export type KeyPairType = {
  publicKey: string;
  privateKey: string;
};

@Schema({ _id: false })
export class MachineUsage {
  @Prop({ required: true, default: 0 })
  cpu!: number;

  @Prop({ required: true, default: 0 })
  memory!: number;

  @Prop({ required: true, default: 0 })
  disk!: number;

  @Prop({ required: true, default: 0 })
  ping!: number;

  @Prop({ required: true, default: false })
  isOnline!: boolean;

  @Prop({ required: false })
  lastReportedAt!: Date;
}

@Schema({ autoCreate: true, autoIndex: true })
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

  @Prop({ type: MachineUsage })
  machineUsage!: MachineUsage;

  @Prop({ required: false })
  group!: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
