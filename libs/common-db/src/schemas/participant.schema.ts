import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type Document } from 'mongoose';

export type ParticipantDocument = Participant & Document;

@Schema({ _id: false })
export class ProblemData {
  @Prop({ required: true, default: 0 })
  solveTime!: number; // Minutes from contest start to first AC

  @Prop({ required: true, default: 0 })
  wrongTries!: number; // Number of wrong submissions before AC
}

export const ProblemDataSchema = SchemaFactory.createForClass(ProblemData);

@Schema()
export class Participant {
  // VNOJ username of the participant
  @Prop({ required: true })
  username!: string;

  @Prop({ required: true })
  contest!: string;

  // Mapped user username in our system
  @Prop({ required: false })
  mapToUser?: string;

  // Number of solved problems (for efficient sorting)
  @Prop({ required: false, default: 0 })
  solvedCount!: number;

  // Total penalty in minutes (sum of solve times + wrong submission penalties)
  @Prop({ required: false, default: 0 })
  totalPenalty!: number;

  // Current rank in the contest (calculated after each sync batch)
  @Prop({ required: false, default: 0 })
  rank!: number;

  // Array of solved problem codes
  @Prop({ type: [String], default: [] })
  solvedProblems!: string[];

  // Per-problem tracking data: { problemCode: { solveTime, wrongTries } }
  @Prop({ type: Map, of: ProblemDataSchema, default: {} })
  problemData!: Map<string, ProblemData>;
}

export const ParticipantSchema = SchemaFactory.createForClass(Participant);

// Create compound index for uniqueness
ParticipantSchema.index({ username: 1, contest: 1 }, { unique: true });

// Create compound index for efficient ranking queries
ParticipantSchema.index({ contest: 1, solvedCount: -1, totalPenalty: 1 });
