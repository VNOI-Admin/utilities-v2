import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type Document } from 'mongoose';

export type LuksRecoveryDocument = LuksRecovery & Document;

// Stored like the machine WireGuard keys: a plain field in the internal database,
// written only by the machine itself through the HMAC-authenticated escrow endpoint.
@Schema()
export class LuksRecovery {
  @Prop({ required: true, unique: true })
  username!: string;

  @Prop({ required: true })
  recoveryPassphrase!: string;

  @Prop({ required: false })
  escrowedAt?: Date;

  @Prop({ required: false })
  updatedAt?: Date;
}

export const LuksRecoverySchema = SchemaFactory.createForClass(LuksRecovery);
