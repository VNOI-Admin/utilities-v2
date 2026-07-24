import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type Document, SchemaTypes } from 'mongoose';

export const CONTESTANT_LOGIN_LOCKED_UNTIL_CONFIG_KEY = 'contestantLoginLockedUntil';

/**
 * Reaction timing knobs, stored as a single object so the settings page saves
 * them atomically. See `resolveReactionTiming` in `@libs/common/helper/reaction-timing`
 * for the shape, defaults and the settings→env→default precedence.
 */
export const REACTION_TIMING_CONFIG_KEY = 'reactionTiming';

export type SystemConfigDocument = SystemConfig & Document;

@Schema({ autoCreate: true, autoIndex: true, timestamps: true })
export class SystemConfig {
  @Prop({ required: true, unique: true })
  key!: string;

  @Prop({ type: SchemaTypes.Mixed })
  value!: unknown;
}

export const SystemConfigSchema = SchemaFactory.createForClass(SystemConfig);
