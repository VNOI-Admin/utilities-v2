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
}

export const ProblemSchema = SchemaFactory.createForClass(Problem);

// Create compound index for uniqueness
ProblemSchema.index({ code: 1, contest: 1 }, { unique: true });
