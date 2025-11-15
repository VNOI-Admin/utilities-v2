import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ContestantDocument = HydratedDocument<Contestant>;

export enum StreamStatus {
  OFFLINE = 'offline',
  ONLINE = 'online',
  ERROR = 'error',
}

@Schema({ timestamps: true })
export class Contestant {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, unique: true })
  contestantId!: string;

  @Prop({ required: false })
  streamUrl?: string;

  @Prop({ required: false })
  webcamUrl?: string;

  @Prop({ type: String, enum: StreamStatus, default: StreamStatus.OFFLINE })
  status!: StreamStatus;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  @Prop()
  thumbnailUrl?: string;

  @Prop()
  lastActiveAt?: Date;
}

export const ContestantSchema = SchemaFactory.createForClass(Contestant);

// Add indexes
ContestantSchema.index({ contestantId: 1 });
ContestantSchema.index({ status: 1 });
