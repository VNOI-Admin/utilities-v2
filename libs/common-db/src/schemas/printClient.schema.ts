import * as crypto from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Types } from 'mongoose';
import { type Document } from 'mongoose';

export type PrintClientDocument = PrintClient & Document;

@Schema()
export class PrintClient {
  @Prop({ required: true, unique: true })
  clientId: string;

  @Prop({ required: true })
  authKey: string;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({ required: true, default: false })
  isOnline: boolean;

  @Prop({ default: null })
  lastReportedAt: Date;
}

export const PrintClientSchema = SchemaFactory.createForClass(PrintClient);

PrintClientSchema.pre('validate', async function (next) {
  // Generate authKey.
  if (!this.authKey) {
    this.authKey = crypto.randomBytes(32).toString('hex');
  }

  next();
});
