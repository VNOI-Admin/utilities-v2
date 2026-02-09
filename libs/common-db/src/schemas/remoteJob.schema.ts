import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type Document } from 'mongoose';

export type RemoteJobDocument = RemoteJob & Document;

@Schema()
export class RemoteJob {
  @Prop({ unique: true, required: true })
  jobId!: string;

  @Prop({ required: true })
  scriptName!: string;

  @Prop({ required: true })
  scriptHash!: string;

  @Prop({ type: [String], default: [] })
  args!: string[];

  @Prop({ type: Object, default: {} })
  env!: Record<string, string>;

  @Prop({ type: [String], required: true })
  targets!: string[];

  @Prop({
    type: Object,
    required: true,
    default: {
      pending: 0,
      running: 0,
      success: 0,
      failed: 0,
    },
  })
  statusCounts!: {
    pending: number;
    running: number;
    success: number;
    failed: number;
  };

  @Prop({ required: true })
  createdBy!: string;

  @Prop({ required: false })
  createdAt?: Date;
}

export const RemoteJobSchema = SchemaFactory.createForClass(RemoteJob);

RemoteJobSchema.index({ createdAt: -1 });
RemoteJobSchema.index({ scriptName: 1, createdAt: -1 });
RemoteJobSchema.index({ createdBy: 1, createdAt: -1 });

RemoteJobSchema.pre('save', function (next) {
  if (!this.createdAt) {
    this.createdAt = new Date();
  }
  next();
});
