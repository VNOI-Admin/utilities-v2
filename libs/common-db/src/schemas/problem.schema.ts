import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type Document, Schema as MongooseSchema } from 'mongoose';

export type ProblemDocument = Problem & Document;

@Schema()
export class Problem {
  @Prop({ required: true })
  code!: string;

  @Prop({ required: true, type: MongooseSchema.Types.String, ref: 'Contest' })
  contest!: string;
}

export const ProblemSchema = SchemaFactory.createForClass(Problem);

// Create compound index for uniqueness
ProblemSchema.index({ code: 1, contest: 1 }, { unique: true });
