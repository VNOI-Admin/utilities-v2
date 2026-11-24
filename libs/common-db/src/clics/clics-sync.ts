import type { Model } from 'mongoose';

import type { ContestDocument } from '../schemas/contest.schema';
import type { ParticipantDocument } from '../schemas/participant.schema';
import type { ProblemDocument } from '../schemas/problem.schema';
import { type SubmissionDocument, SubmissionStatus } from '../schemas/submission.schema';

export interface ClicsContest {
  id: string;
  name: string;
  start_time?: string | null;
  duration: string;
  scoreboard_freeze_duration?: string | null;
  penalty_time?: number | string;
}

export interface ClicsProblem {
  id: string;
  label: string;
  name: string;
  ordinal: number;
}

export interface ClicsTeam {
  id: string;
  name: string;
  hidden?: boolean;
}

export interface ClicsSubmission {
  id: string;
  team_id: string;
  problem_id: string;
  language_id: string;
  time: string;
}

export interface ClicsJudgement {
  id: string;
  submission_id: string;
  judgement_type_id?: string | null;
  start_time: string;
  end_time?: string | null;
  current?: boolean;
}

export interface ClicsSnapshot {
  contest?: ClicsContest;
  problems: Map<string, ClicsProblem>;
  teams: Map<string, ClicsTeam>;
  submissions: Map<string, ClicsSubmission>;
  judgements: Map<string, ClicsJudgement>;
}

type CollectionType = 'problems' | 'teams' | 'submissions' | 'judgements';
const COLLECTIONS = new Set<string>(['problems', 'teams', 'submissions', 'judgements']);

export function parseEventFeed(text: string): ClicsSnapshot {
  const snapshot: ClicsSnapshot = {
    problems: new Map(),
    teams: new Map(),
    submissions: new Map(),
    judgements: new Map(),
  };

  for (const raw of text.split('\n')) {
    if (!raw.trim()) continue;
    const { type, id, data } = JSON.parse(raw) as { type: string; id?: string | null; data: unknown };

    if (type === 'contest') {
      snapshot.contest = data as ClicsContest;
      continue;
    }
    if (!COLLECTIONS.has(type)) continue;

    const collection = snapshot[type as CollectionType] as Map<string, { id: string }>;
    if (id == null) {
      collection.clear();
      for (const item of data as { id: string }[]) collection.set(item.id, item);
    } else if (data === null) {
      collection.delete(id);
    } else {
      collection.set(id, data as { id: string });
    }
  }

  return snapshot;
}

export function parseReltime(value: string): number {
  const match = /^(-)?(\d+):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/.exec(value);
  if (!match) throw new Error(`Invalid RELTIME: ${value}`);
  const [, sign, hours, minutes, seconds, millis = '0'] = match;
  const total = ((Number(hours) * 60 + Number(minutes)) * 60 + Number(seconds)) * 1000 + Number(millis.padEnd(3, '0'));
  return sign ? -total : total;
}

export interface ClicsSyncPlan {
  contest?: { name: string; start_time: Date; end_time: Date; frozen_at?: Date; penalty?: number };
  problems: { code: string; name: string; label: string; ordinal: number }[];
  participants: { username: string; hidden: boolean }[];
  submissions: {
    external_id: string;
    author: string;
    problem_code: string;
    language: string;
    submittedAt: Date;
    judgedAt?: Date;
    judgeEndAt?: Date;
    submissionStatus: SubmissionStatus;
    penaltyMinutes: number;
  }[];
}

const KNOWN_STATUSES = new Set<string>(Object.values(SubmissionStatus));

function toStatus(judgementType?: string | null): SubmissionStatus {
  return judgementType && KNOWN_STATUSES.has(judgementType)
    ? (judgementType as SubmissionStatus)
    : SubmissionStatus.UNKNOWN;
}

function toPenaltyMinutes(value?: number | string): number | undefined {
  if (value == null) return undefined;
  return typeof value === 'number' ? value : parseReltime(value) / 60_000;
}

export function planClicsSync(snapshot: ClicsSnapshot, contestCode: string): ClicsSyncPlan {
  const prefix = `${contestCode}_`;
  const stripPrefix = (code: string) => (code.startsWith(prefix) ? code.slice(prefix.length) : code);

  const { contest } = snapshot;
  let contestPlan: ClicsSyncPlan['contest'];
  if (contest?.start_time) {
    const start = new Date(contest.start_time);
    const end = new Date(start.getTime() + parseReltime(contest.duration));
    contestPlan = {
      name: contest.name,
      start_time: start,
      end_time: end,
      ...(contest.scoreboard_freeze_duration
        ? { frozen_at: new Date(end.getTime() - parseReltime(contest.scoreboard_freeze_duration)) }
        : {}),
      penalty: toPenaltyMinutes(contest.penalty_time),
    };
  }

  const judgementBySubmission = new Map<string, ClicsJudgement>();
  for (const judgement of snapshot.judgements.values()) {
    if (judgement.current === false) continue;
    const existing = judgementBySubmission.get(judgement.submission_id);
    if (!existing || existing.start_time <= judgement.start_time) {
      judgementBySubmission.set(judgement.submission_id, judgement);
    }
  }

  const startMs = contestPlan?.start_time.getTime();
  const submissions = [...snapshot.submissions.values()].map((submission) => {
    const judgement = judgementBySubmission.get(submission.id);
    const submittedAt = new Date(submission.time);
    return {
      external_id: submission.id,
      author: submission.team_id,
      problem_code: stripPrefix(submission.problem_id),
      language: submission.language_id,
      submittedAt,
      judgedAt: judgement ? new Date(judgement.start_time) : undefined,
      judgeEndAt: judgement?.end_time ? new Date(judgement.end_time) : undefined,
      submissionStatus: judgement ? toStatus(judgement.judgement_type_id) : SubmissionStatus.PENDING,
      penaltyMinutes: startMs === undefined ? 0 : Math.floor((submittedAt.getTime() - startMs) / 60_000),
    };
  });

  return {
    contest: contestPlan,
    problems: [...snapshot.problems.values()].map((problem) => ({
      code: stripPrefix(problem.id),
      name: problem.name,
      label: problem.label,
      ordinal: problem.ordinal,
    })),
    participants: [...snapshot.teams.values()].map((team) => ({
      username: team.id,
      hidden: team.hidden ?? false,
    })),
    submissions,
  };
}

export interface ClicsSyncModels {
  contestModel: Model<ContestDocument>;
  problemModel: Model<ProblemDocument>;
  participantModel: Model<ParticipantDocument>;
  submissionModel: Model<SubmissionDocument>;
}

export function clicsFeedEnabled(): boolean {
  return process.env.VNOJ_CLICS_FEED === 'true';
}

export async function applyClicsSyncPlan(
  models: ClicsSyncModels,
  contestCode: string,
  plan: ClicsSyncPlan,
): Promise<{ upserted: number; modified: number }> {
  if (plan.contest) {
    const { frozen_at, penalty, ...rest } = plan.contest;
    await models.contestModel.updateOne(
      { code: contestCode },
      {
        $set: { ...rest, ...(frozen_at ? { frozen_at } : {}), ...(penalty !== undefined ? { penalty } : {}) },
        ...(frozen_at ? {} : { $unset: { frozen_at: 1 } }),
      },
    );
  }

  if (plan.problems.length > 0) {
    await models.problemModel.bulkWrite(
      plan.problems.map(({ code, ...fields }) => ({
        updateOne: { filter: { code, contest: contestCode }, update: { $set: fields }, upsert: true },
      })),
    );
  }

  if (plan.participants.length > 0) {
    await models.participantModel.bulkWrite(
      plan.participants.map(({ username, hidden }) => ({
        updateOne: { filter: { username, contest: contestCode }, update: { $set: { hidden } }, upsert: true },
      })),
    );
  }

  if (plan.submissions.length === 0) return { upserted: 0, modified: 0 };

  const result = await models.submissionModel.bulkWrite(
    plan.submissions.map(({ penaltyMinutes, judgedAt, judgeEndAt, ...fields }) => {
      const unset = { ...(judgedAt ? {} : { judgedAt: 1 }), ...(judgeEndAt ? {} : { judgeEndAt: 1 }) };
      return {
        updateOne: {
          filter: { external_id: fields.external_id },
          update: {
            $set: {
              ...fields,
              contest_code: contestCode,
              'data.penalty': penaltyMinutes,
              ...(judgedAt ? { judgedAt } : {}),
              ...(judgeEndAt ? { judgeEndAt } : {}),
            },
            ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
            $setOnInsert: { 'data.score': 0, 'data.renderRetries': 0 },
          },
          upsert: true,
        },
      };
    }),
  );

  return { upserted: result.upsertedCount ?? 0, modified: result.modifiedCount ?? 0 };
}
