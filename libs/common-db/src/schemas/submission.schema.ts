import { Prop, Schema, SchemaFactory, raw } from '@nestjs/mongoose';
import { type Document, Schema as MongooseSchema } from 'mongoose';

export type SubmissionDocument = Submission & Document;

export enum SubmissionStatus {
  AC = 'AC',
  PAC = 'PAC', // Partially Accepted (VNOJ partial scoring)
  WA = 'WA',
  RTE = 'RTE',
  RE = 'RE',
  IR = 'IR',
  OLE = 'OLE',
  MLE = 'MLE',
  TLE = 'TLE',
  SC = 'SC', // Short Circuited
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

  @Prop({ required: false, default: 0 })
  renderRetries?: number;
}

@Schema()
export class Submission {
  @Prop({ required: true })
  submittedAt!: Date;

  /** When judging STARTED. */
  @Prop({ required: false })
  judgedAt?: Date;

  /**
   * When judging FINISHED — the moment the verdict actually surfaces to the
   * contestant, and what the reaction renderer anchors its pending→verdict
   * reveal to. Absent on submissions synced before the upstream feed exposed it;
   * callers fall back to `judgedAt`.
   */
  @Prop({ required: false })
  judgeEndAt?: Date;

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

  // Points awarded to this submission by VNOJ (optional; used by the VNOJ
  // contest format for points-based ranking). May be absent for older
  // submissions or when the VNOJ feed does not provide it.
  @Prop({ required: false })
  points?: number;
}

export const SubmissionSchema = SchemaFactory.createForClass(Submission);

// Create indexes for efficient queries
SubmissionSchema.index({ contest_code: 1, submittedAt: -1 });
SubmissionSchema.index({ author: 1, contest_code: 1 });
SubmissionSchema.index({ submissionStatus: 1, 'data.reaction': 1, 'data.renderRetries': 1 });

// Unique index on external_id to prevent duplicate submissions
SubmissionSchema.index({ external_id: 1 }, { unique: true, sparse: true });

// Compound index for contest-participant-problem queries
SubmissionSchema.index({ contest_code: 1, author: 1, problem_code: 1 });
