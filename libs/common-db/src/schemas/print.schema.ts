import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Types } from 'mongoose';
import { type Document, SchemaTypes } from 'mongoose';

export enum PrintStatus {
  QUEUED = 'queued',
  PRINTING = 'printing',
  DONE = 'done',
}

export type PrintDocument = Print & Document;

@Schema()
export class Print {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  user: Types.ObjectId;

  @Prop({ required: true })
  requestedAt: Date;

  @Prop({ required: true })
  content: string;
}

export const PrintSchema = SchemaFactory.createForClass(Print);
