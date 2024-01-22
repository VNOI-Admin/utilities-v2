import { Prop, raw,Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Document } from 'mongoose';

export type UserDocument = User & Document;

export type KeyPairType = {
  publicKey: string;
  privateKey: string;
};

@Schema()
export class User {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  refreshToken: string;

  @Prop({ required: true, default: 'user' })
  role: 'admin' | 'coach' | 'user';

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
}

export const UserSchema = SchemaFactory.createForClass(User);
