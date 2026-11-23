import { Contest, ContestSchema } from '@libs/common-db/schemas/contest.schema';
import {
  COACH_ACCESS_REOPENED_AT_CONFIG_KEY,
  SystemConfig,
  SystemConfigSchema,
} from '@libs/common-db/schemas/systemConfig.schema';
import type { Connection, Model, Schema } from 'mongoose';

export interface CoachAccessStatus {
  locked: boolean;
  frozenAt: Date | null;
  nextFreezeAt: Date | null;
  reopenedAt: Date | null;
}

type Freeze = { frozen_at?: Date };

function modelOf(db: Connection, name: string, schema: Schema): Model<any> {
  return db.models[name] ?? db.model(name, schema);
}

export async function getCoachAccessStatus(db: Connection, now = new Date()): Promise<CoachAccessStatus> {
  const contests = modelOf(db, Contest.name, ContestSchema);
  const configs = modelOf(db, SystemConfig.name, SystemConfigSchema);
  const [last, next, config] = await Promise.all([
    contests
      .findOne({ frozen_at: { $lte: now } })
      .sort({ frozen_at: -1 })
      .lean<Freeze>(),
    contests
      .findOne({ frozen_at: { $gt: now } })
      .sort({ frozen_at: 1 })
      .lean<Freeze>(),
    configs.findOne({ key: COACH_ACCESS_REOPENED_AT_CONFIG_KEY }).lean<{ value?: unknown }>(),
  ]);
  const frozenAt = last?.frozen_at ? new Date(last.frozen_at) : null;
  const reopenedAt = config?.value ? new Date(String(config.value)) : null;
  return {
    locked: frozenAt !== null && (reopenedAt === null || reopenedAt < frozenAt),
    frozenAt,
    nextFreezeAt: next?.frozen_at ? new Date(next.frozen_at) : null,
    reopenedAt,
  };
}
