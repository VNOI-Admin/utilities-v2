import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type Document } from 'mongoose';

export type MachineNonceDocument = MachineNonce & Document;

@Schema({ autoCreate: true, autoIndex: true })
export class MachineNonce {
  @Prop({ required: true, unique: true })
  nonce!: string;

  @Prop({ required: true })
  expiresAt!: Date;
}

export const MachineNonceSchema = SchemaFactory.createForClass(MachineNonce);

MachineNonceSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
