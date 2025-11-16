import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { type Document, Schema as MongooseSchema } from 'mongoose';

export type SubmissionDocument = Submission & Document;

export enum SubmissionStatus {
  AC = 'AC',
  WA = 'WA',
  TLE = 'TLE',
  MLE = 'MLE',
  RE = 'RE',
  CE = 'CE',
  PE = 'PE',
  IE = 'IE',
  PENDING = 'PENDING',
}

@Schema({ _id: false })
export class SubmissionData {
  @Prop({ required: true, default: 0 })
  score!: number;

  @Prop({ required: true, default: 0 })
  penalty!: number;

  @Prop({ required: true, default: 0 })
  old_rank!: number;

  @Prop({ required: true, default: 0 })
  new_rank!: number;

  @Prop({ required: false })
  reaction?: string;
}

@Schema()
export class Submission {
  @Prop({ required: true })
  submittedAt!: Date;

  @Prop({ required: false })
  judgedAt?: Date;

  @Prop({ required: true })
  author!: string;

  @Prop({ required: true, enum: Object.values(SubmissionStatus) })
  submissionStatus!: SubmissionStatus;

  @Prop({ required: true })
  contest_code!: string;

  @Prop({ required: true })
  problem_code!: string;

  @Prop({ type: SubmissionData })
  data!: SubmissionData;

  @Prop({ required: false })
  external_id?: string;

  @Prop({ required: false })
  language?: string;
}

export const SubmissionSchema = SchemaFactory.createForClass(Submission);

// Create indexes for efficient queries
SubmissionSchema.index({ contest_code: 1, submittedAt: -1 });
SubmissionSchema.index({ author: 1, contest_code: 1 });
SubmissionSchema.index({ submissionStatus: 1, 'data.reaction': 1 });
