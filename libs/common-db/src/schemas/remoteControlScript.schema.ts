import { createHash } from 'crypto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type Document } from 'mongoose';

export type RemoteControlScriptDocument = RemoteControlScript & Document;

@Schema()
export class RemoteControlScript {
  @Prop({ required: true, unique: true })
  name!: string;

  @Prop({ required: true })
  hash!: string;

  @Prop({ required: true })
  content!: string;

  @Prop({ required: false })
  createdAt?: Date;

  @Prop({ required: false })
  updatedAt?: Date;
}

export const RemoteControlScriptSchema = SchemaFactory.createForClass(RemoteControlScript);

RemoteControlScriptSchema.index({ name: 1 }, { unique: true });

RemoteControlScriptSchema.pre('validate', function (next) {
  if (this.isModified('content')) {
    this.hash = createHash('sha256').update(this.content).digest('hex');
  }
  next();
});

RemoteControlScriptSchema.pre('save', function (next) {
  const now = new Date();
  if (!this.createdAt) {
    this.createdAt = now;
  }
  this.updatedAt = now;

  next();
});
