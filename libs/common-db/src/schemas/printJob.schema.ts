import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Types } from 'mongoose';
import { type Document, SchemaTypes } from 'mongoose';
import { UserDocument } from './user.schema';

export enum PrintStatus {
  QUEUED = 'queued',
  PRINTING = 'printing',
  DONE = 'done',
}

export type PrintJobDocument = PrintJob & Document;

@Schema()
export class PrintJob {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  user: UserDocument;

  @Prop()
  clientId: string;

  @Prop({ required: true, enum: PrintStatus, default: PrintStatus.QUEUED })
  status: PrintStatus;

  @Prop({ required: true, default: 0 })
  priority: number;

  @Prop({ required: true })
  requestedAt: Date;

  @Prop({ required: true })
  filename: string;

  @Prop({ required: true })
  content: string;
}

export const PrintJobSchema = SchemaFactory.createForClass(PrintJob);
