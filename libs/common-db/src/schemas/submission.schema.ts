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

export type SubmissionData = {
  score: number;
  penalty: number;
  old_rank: number;
  new_rank: number;
  reaction?: string;
};

@Schema()
export class Submission {
  @Prop({ required: true })
  submittedAt!: Date;

  @Prop({ required: false })
  judgedAt?: Date;

  @Prop({ required: true })
  author!: string;

  @Prop({ required: true, type: String, enum: Object.values(SubmissionStatus) })
  submissionStatus!: SubmissionStatus;

  @Prop({ required: true, type: MongooseSchema.Types.String, ref: 'Contest' })
  contest_code!: string;

  @Prop({ required: true, type: MongooseSchema.Types.String, ref: 'Problem' })
  problem_code!: string;

  @Prop(
    raw({
      score: { type: Number, default: 0 },
      penalty: { type: Number, default: 0 },
      old_rank: { type: Number, default: 0 },
      new_rank: { type: Number, default: 0 },
      reaction: { type: String, default: undefined },
    }),
  )
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
