import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type Document } from 'mongoose';

export enum PrintStatus {
  QUEUED = 'queued',
  PRINTING = 'printing',
  DONE = 'done',
}

export type PrintJobDocument = PrintJob & Document;

@Schema()
export class PrintJob {
  @Prop({ unique: true })
  jobId!: string;

  @Prop()
  username!: string;

  @Prop()
  clientId!: string;

  @Prop({ required: true, enum: PrintStatus, default: PrintStatus.QUEUED })
  status!: PrintStatus;

  @Prop({ required: true, default: 0 })
  priority!: number;

  @Prop({ required: true })
  requestedAt!: Date;

  @Prop({ required: true })
  filename!: string;

  @Prop({ required: true })
  content!: string;
}

export const PrintJobSchema = SchemaFactory.createForClass(PrintJob);
