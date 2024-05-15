import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type { Types } from 'mongoose';
import { type Document, SchemaTypes } from 'mongoose';

export type GroupDocument = Group & Document;

@Schema()
export class Group {
  @Prop({ required: true, unique: true })
  groupCodeName: string;

  @Prop({ required: true })
  groupFullName: string;

  // Many to many with User
  @Prop({ type: [{ type: SchemaTypes.ObjectId, ref: 'User' }] })
  members: Types.ObjectId[];
}

export const GroupSchema = SchemaFactory.createForClass(Group);
