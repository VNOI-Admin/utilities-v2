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

  @Prop({ required: false, default: 20 })
  penalty?: number; // Minutes penalty per wrong submission before first AC

  // Ranking/scoring format. Defaults to ICPC for backwards compatibility.
  @Prop({ required: false, enum: Object.values(ContestFormat), default: ContestFormat.ICPC })
  format?: ContestFormat;
}

export const ContestSchema = SchemaFactory.createForClass(Contest);
