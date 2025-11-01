import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type Document, Schema as MongooseSchema } from 'mongoose';

export type ParticipantDocument = Participant & Document;

@Schema()
export class Participant {
  @Prop({ required: true })
  vnoj_username!: string;

  @Prop({ required: true, type: MongooseSchema.Types.String, ref: 'Contest' })
  contest!: string;

  @Prop({ required: false, type: MongooseSchema.Types.String, ref: 'User' })
  linked_user?: string;

  @Prop({ required: true, default: 0 })
  rank!: number;
}

export const ParticipantSchema = SchemaFactory.createForClass(Participant);

// Create compound index for uniqueness
ParticipantSchema.index({ vnoj_username: 1, contest: 1 }, { unique: true });
