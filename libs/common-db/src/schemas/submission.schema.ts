import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { type Document, Schema as MongooseSchema } from 'mongoose';

export type SubmissionDocument = Submission & Document;

export enum SubmissionStatus {
  AC = 'AC',
  WA = 'WA',
  RTE = 'RTE',
  RE = 'RE',
  IR = 'IR',
  OLE = 'OLE',
  MLE = 'MLE',
  TLE = 'TLE',
  IE = 'IE',
  AB = 'AB',
  CE = 'CE',
  UNKNOWN = 'UNKNOWN',
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

  @Prop({ required: false, default: false })
  balloon_sent?: boolean;
}

export const SubmissionSchema = SchemaFactory.createForClass(Submission);

// Create indexes for efficient queries
SubmissionSchema.index({ contest_code: 1, submittedAt: -1 });
SubmissionSchema.index({ author: 1, contest_code: 1 });
SubmissionSchema.index({ submissionStatus: 1, 'data.reaction': 1 });
SubmissionSchema.index({ submissionStatus: 1, balloon_sent: 1, submittedAt: 1 });
