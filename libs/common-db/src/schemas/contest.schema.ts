import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type Document } from 'mongoose';

export type ContestDocument = Contest & Document;

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

  @Prop({ required: false })
  last_sync_at?: Date;
}

export const ContestSchema = SchemaFactory.createForClass(Contest);
