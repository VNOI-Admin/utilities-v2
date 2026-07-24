import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type Document } from 'mongoose';

export type ContestDocument = Contest & Document;

/**
 * Ranking/scoring format for a contest.
 * - ICPC: ranked by number of AC problems, tiebreak by penalty (the default).
 * - VNOJ: ranked by total points, tiebreak by cumulative time then last solve.
 */
export enum ContestFormat {
  ICPC = 'ICPC',
  VNOJ = 'VNOJ',
}

@Schema()
export class Contest {
  @Prop({ required: true, unique: true })
  code!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  start_time!: Date;

  @Prop({ required: true })
  end_time!: Date;

  @Prop({ required: false })
  frozen_at?: Date;

  // Minutes of penalty per counted submission. Left unset the contest falls back
  // to the judge's per-format default (see DEFAULT_PENALTY_MINUTES) — there is no
  // single schema-wide default because ICPC and VNOJ disagree on it.
  @Prop({ required: false })
  penalty?: number;

  // Ranking/scoring format. Defaults to ICPC for backwards compatibility.
  @Prop({ required: false, enum: Object.values(ContestFormat), default: ContestFormat.ICPC })
  format?: ContestFormat;

  // VNOJ only — "Last Submission Only". When set, cumulative time is the time of
  // the single latest scoring submission rather than the sum across problems.
  // Ignored by ICPC, which always sums. Defaults to false, like the judge.
  @Prop({ required: false, default: false })
  lso?: boolean;
}

export const ContestSchema = SchemaFactory.createForClass(Contest);

/**
 * Penalty minutes applied per counted submission when a contest does not set its
 * own. These mirror the judge's per-format `config_defaults`: ICPC charges 20
 * minutes, VNOJ only 5. Applying the ICPC figure to a VNOJ contest weighs every
 * attempt four times too heavily and demonstrably reorders the scoreboard.
 */
export const DEFAULT_PENALTY_MINUTES: Record<ContestFormat, number> = {
  [ContestFormat.ICPC]: 20,
  [ContestFormat.VNOJ]: 5,
};

/**
 * Resolve the penalty a contest scores with. Uses `??` rather than `||` on
 * purpose: 0 is a valid configuration (the judge validates `penalty >= 0` and
 * has a dedicated no-penalty ranking description), so it must not fall through
 * to the default.
 */
export function resolvePenaltyMinutes(contest: {
  format?: ContestFormat;
  penalty?: number | null;
}): number {
  return contest.penalty ?? DEFAULT_PENALTY_MINUTES[contest.format ?? ContestFormat.ICPC];
}
