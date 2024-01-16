import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

type KeyPairType = {
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

  // Allow null for several documents. For non-null, unique is enforced.
  @Prop({ unique: true, sparse: true })
  ipAddress: string;

  @Prop({ required: true, default: 'user' })
  userType: 'admin' | 'coach' | 'user';

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop(
    raw({
      publicKey: { type: String },
      privateKey: { type: String },
    }),
  )
  keyPair: KeyPairType;
}

export const UserSchema = SchemaFactory.createForClass(User);
