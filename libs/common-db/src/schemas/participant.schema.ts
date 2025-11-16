import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type Document, Schema as MongooseSchema } from 'mongoose';

export type ParticipantDocument = Participant & Document;

@Schema()
export class Participant {
  // VNOJ username of the participant
  @Prop({ required: true })
  username!: string;

  @Prop({ required: true })
  contest!: string;

  // Mapped user ID in our system
  @Prop({ required: false })
  mapToUser?: string;
}

export const ParticipantSchema = SchemaFactory.createForClass(Participant);

// Create compound index for uniqueness
ParticipantSchema.index({ username: 1, contest: 1 }, { unique: true });
