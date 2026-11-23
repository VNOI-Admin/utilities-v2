import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type Document } from 'mongoose';

export type ParticipantDocument = Participant & Document;

@Schema({ _id: false })
export class ProblemData {
  // Time from contest start to the scoring submission, in the contest format's
  // own unit: minutes for ICPC, seconds for VNOJ (matching the judge).
  @Prop({ required: true, default: 0 })
  solveTime!: number;

  @Prop({ required: true, default: 0 })
  wrongTries!: number; // Number of wrong submissions before the scoring submission

  // VNOJ format: best points achieved on this problem.
  @Prop({ required: false })
  points?: number;

  // VNOJ format: submissions made after the freeze time that are not yet
  // reflected in the frozen scoreboard.
  @Prop({ required: false })
  pending?: number;
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

  // Sum of solve times + attempt penalties, in the format's time unit (ICPC:
  // minutes; VNOJ: seconds, where it simply mirrors cumtime and is unused for
  // ranking).
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

  // --- VNOJ format (points-based) metrics. Unused / 0 for ICPC contests. ---

  // Total points scored across all problems.
  @Prop({ required: false, default: 0 })
  score!: number;

  // Primary tiebreak: sum of solve times + penalties, in seconds. The judge
  // scores VNOJ in exact seconds rather than whole minutes so that participants
  // who scored within the same minute are still separated.
  @Prop({ required: false, default: 0 })
  cumtime!: number;

  // Secondary tiebreak: time of the latest scoring submission (seconds).
  @Prop({ required: false, default: 0 })
  tiebreaker!: number;

  // --- Frozen scoreboard snapshot (VNOJ contests with a freeze time). ---

  @Prop({ required: false, default: 0 })
  frozenScore!: number;

  @Prop({ required: false, default: 0 })
  frozenCumtime!: number;

  @Prop({ required: false, default: 0 })
  frozenTiebreaker!: number;

  // Rank on the frozen scoreboard (1-indexed).
  @Prop({ required: false, default: 0 })
  frozenRank!: number;

  // Per-problem tracking data computed from pre-freeze submissions only.
  @Prop({ type: Map, of: ProblemDataSchema, default: {} })
  frozenProblemData!: Map<string, ProblemData>;
}

export const ParticipantSchema = SchemaFactory.createForClass(Participant);

// Create compound index for uniqueness
ParticipantSchema.index({ username: 1, contest: 1 }, { unique: true });

// Create compound index for efficient ICPC ranking queries
ParticipantSchema.index({ contest: 1, solvedCount: -1, totalPenalty: 1 });

// Create compound index for efficient VNOJ (points-based) ranking queries
ParticipantSchema.index({ contest: 1, score: -1, cumtime: 1, tiebreaker: 1 });
