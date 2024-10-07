import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type Document } from 'mongoose';

export type OverlayLayoutDocument = OverlayLayout & Document;

@Schema()
export class OverlayLayout {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ required: true, type: Object })
  data: Record<string, any>;
}

export const OverlayLayoutSchema = SchemaFactory.createForClass(OverlayLayout);
