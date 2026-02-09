import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type Document } from 'mongoose';

export enum RemoteJobRunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export type RemoteJobRunDocument = RemoteJobRun & Document;

@Schema()
export class RemoteJobRun {
  @Prop({ required: true })
  jobId!: string;

  @Prop({ required: true })
  target!: string;

  @Prop({ required: true, enum: Object.values(RemoteJobRunStatus), default: RemoteJobRunStatus.PENDING })
  status!: RemoteJobRunStatus;

  @Prop({ required: false, default: null, type: Number })
  exitCode?: number | null;

  @Prop({ required: false, default: null, type: String })
  log?: string | null;

  @Prop({ required: false, default: () => new Date() })
  updatedAt?: Date;
}

export const RemoteJobRunSchema = SchemaFactory.createForClass(RemoteJobRun);

RemoteJobRunSchema.index({ jobId: 1, target: 1 }, { unique: true });
RemoteJobRunSchema.index({ jobId: 1, status: 1 });
RemoteJobRunSchema.index({ updatedAt: -1 });

RemoteJobRunSchema.pre(['save', 'findOneAndUpdate'], function (next) {
  this.set('updatedAt', new Date());
  next();
});
