import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type Document, Schema as MongooseSchema } from 'mongoose';

export type ProblemDocument = Problem & Document;

@Schema()
export class Problem {
  @Prop({ required: true })
  code!: string;

  @Prop({ required: true, type: MongooseSchema.Types.String, ref: 'Contest' })
  contest!: string;

  /**
   * Manually-provided name shown in place of `code` wherever the problem is
   * displayed (scoreboards, submission feeds, reaction grid). Optional — when
   * absent, `code` is used. See {@link resolveProblemName}.
   */
  @Prop({ required: false })
  displayName?: string;

  /**
   * Assumed judging runtime for this problem, in seconds.
   *
   * `Submission.judgedAt` records when judging *started*, not when it finished,
   * so the verdict actually surfaces to the contestant around
   * `judgedAt + assumedRuntimeSeconds`. The reaction renderer anchors its
   * pending→verdict reveal to that estimate (plus a small buffer) instead of to
   * `judgedAt`, which would otherwise flip the banner before the contestant has
   * reacted. Set manually per problem; when absent, `DEFAULT_ASSUMED_RUNTIME_SECONDS`
   * applies. An explicit 0 is honoured as 0 (reveal at `judgedAt`).
   */
  @Prop({ required: false })
  assumedRuntimeSeconds?: number;
}

export const ProblemSchema = SchemaFactory.createForClass(Problem);

// Create compound index for uniqueness
ProblemSchema.index({ code: 1, contest: 1 }, { unique: true });
