import { ContestFormat, resolvePenaltyMinutes } from '@libs/common-db/schemas/contest.schema';
import { SubmissionStatus } from '@libs/common-db/schemas/submission.schema';

export interface ClicsData {
  contest: {
    code: string;
    name: string;
    start_time: Date;
    end_time: Date;
    frozen_at?: Date | null;
    penalty?: number | null;
    format?: ContestFormat;
  };
  problems: { code: string; name?: string; displayName?: string; label?: string; ordinal?: number }[];
  participants: {
    username: string;
    mapToUser?: string;
    hidden?: boolean;
    rank: number;
    solvedCount: number;
    solvedProblems: string[];
    totalPenalty: number;
    score?: number;
    cumtime?: number;
    problemData: Record<string, { solveTime: number; wrongTries: number; points?: number; pending?: number }>;
  }[];
  users: { username: string; fullName?: string; group?: string; role: string; vpnIpAddress?: string | null }[];
  groups: { code: string; name: string; logoUrl?: string }[];
  submissions: {
    _id?: unknown;
    external_id?: string;
    author: string;
    problem_code: string;
    language?: string;
    submittedAt: Date;
    judgedAt?: Date;
    judgeEndAt?: Date;
    submissionStatus: string;
    points?: number;
    data?: { reaction?: string };
  }[];
}

export interface ClicsMedia {
  streamBase?: string;
  streamToken: (ip: string) => string;
}

export interface ClicsFile {
  href: string;
  mime: string;
}

export function formatTime(value: Date): string {
  return value.toISOString().replace('Z', '+00:00');
}

export function formatReltime(ms: number): string {
  const sign = ms < 0 ? '-' : '';
  const total = Math.floor(Math.abs(ms));
  const millis = total % 1000;
  const seconds = Math.floor(total / 1000) % 60;
  const minutes = Math.floor(total / 60_000) % 60;
  const hours = Math.floor(total / 3_600_000);
  const pad = (n: number, width = 2) => String(n).padStart(width, '0');
  return `${sign}${hours}:${pad(minutes)}:${pad(seconds)}.${pad(millis, 3)}`;
}

const JUDGEMENT_TYPE_NAMES: Record<string, string> = {
  AC: 'Accepted',
  WA: 'Wrong Answer',
  TLE: 'Time Limit Exceeded',
  MLE: 'Memory Limit Exceeded',
  OLE: 'Output Limit Exceeded',
  RTE: 'Run-Time Error',
  CE: 'Compile Error',
  RE: 'Rejected',
  JE: 'Judging Error',
  CS: 'Contact Staff',
};

const SPEC_JUDGEMENT_TYPE: Record<string, string> = {
  RE: 'RTE',
  IR: 'RTE',
  PAC: 'RE',
  SC: 'RE',
  IE: 'JE',
};

function judgementTypeId(status: string): string {
  return SPEC_JUDGEMENT_TYPE[status] ?? (status in JUDGEMENT_TYPE_NAMES ? status : 'CS');
}

const PENALTY_FREE = new Set(['AC', 'CE', 'JE']);

const IMAGE_MIME: Record<string, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

function imageMime(url: string): string {
  const extension = /\.([a-z0-9]+)(?:[?#].*)?$/i.exec(url)?.[1]?.toLowerCase() ?? '';
  return IMAGE_MIME[extension] ?? 'image/png';
}

export function buildContest(contest: ClicsData['contest']) {
  return {
    id: contest.code,
    name: contest.name,
    formal_name: contest.name,
    start_time: formatTime(contest.start_time),
    duration: formatReltime(contest.end_time.getTime() - contest.start_time.getTime()),
    ...(contest.frozen_at
      ? { scoreboard_freeze_duration: formatReltime(contest.end_time.getTime() - contest.frozen_at.getTime()) }
      : {}),
    scoreboard_type: contest.format === ContestFormat.VNOJ ? 'score' : 'pass-fail',
    penalty_time: resolvePenaltyMinutes(contest),
  };
}

export function buildState(
  contest: ClicsData['contest'],
  now: Date,
  { finalize, hasPending }: { finalize: boolean; hasPending: boolean },
) {
  const reached = (when?: Date | null) => (when && now >= when ? formatTime(when) : null);
  const ended = reached(contest.end_time);
  const final = finalize && ended && !hasPending ? ended : null;
  return {
    started: reached(contest.start_time),
    frozen: reached(contest.frozen_at),
    ended,
    thawed: null,
    finalized: final,
    end_of_updates: final,
  };
}

function orderedProblems(problems: ClicsData['problems']) {
  return [...problems].sort(
    (a, b) =>
      (a.ordinal ?? Number.MAX_SAFE_INTEGER) - (b.ordinal ?? Number.MAX_SAFE_INTEGER) || a.code.localeCompare(b.code),
  );
}

function problemLabel(index: number): string {
  let label = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    label = String.fromCharCode(65 + ((n - 1) % 26)) + label;
  }
  return label;
}

export function buildCollections(data: ClicsData, media: ClicsMedia) {
  const start = data.contest.start_time.getTime();
  const reltime = (when: Date) => formatReltime(when.getTime() - start);
  const isVnoj = data.contest.format === ContestFormat.VNOJ;
  const users = new Map(data.users.map((user) => [user.username, user]));

  const problems = orderedProblems(data.problems).map((problem, index) => ({
    id: problem.code,
    label: problem.label ?? problemLabel(index),
    name: problem.displayName?.trim() || problem.name || problem.code,
    ordinal: problem.ordinal ?? index,
    test_data_count: 0,
  }));

  const stream = (ip: string, file: string): ClicsFile[] => [
    { href: `${media.streamBase}/t/${media.streamToken(ip)}/${ip}/${file}`, mime: 'application/vnd.apple.mpegurl' },
  ];

  const teams = data.participants.map((participant) => {
    const user = participant.mapToUser ? users.get(participant.mapToUser) : undefined;
    const name = user?.fullName || participant.username;
    const ip = user?.role === 'contestant' && media.streamBase ? user.vpnIpAddress : undefined;
    return {
      id: participant.username,
      label: participant.username,
      name,
      display_name: name,
      ...(user?.group ? { organization_id: user.group } : {}),
      group_ids: [] as string[],
      hidden: participant.hidden ?? false,
      ...(ip ? { desktop: stream(ip, 'stream.m3u8'), webcam: stream(ip, 'webcam.m3u8') } : {}),
    };
  });

  const usedGroups = new Set(teams.map((team) => team.organization_id).filter(Boolean));
  const organizations = data.groups
    .filter((group) => usedGroups.has(group.code))
    .map((group) => ({
      id: group.code,
      name: group.name,
      formal_name: group.name,
      ...(group.logoUrl ? { logo: [{ href: group.logoUrl, mime: imageMime(group.logoUrl) }] } : {}),
    }));

  const ordered = [...data.submissions].sort((a, b) => a.submittedAt.getTime() - b.submittedAt.getTime());
  const submissionId = (submission: ClicsData['submissions'][number]) =>
    submission.external_id ?? String(submission._id);

  const submissions = ordered.map((submission) => ({
    id: submissionId(submission),
    language_id: submission.language ?? 'unknown',
    problem_id: submission.problem_code,
    team_id: submission.author,
    time: formatTime(submission.submittedAt),
    contest_time: reltime(submission.submittedAt),
    files: [] as ClicsFile[],
    ...(submission.data?.reaction ? { reaction: [{ href: submission.data.reaction, mime: 'video/mp4' }] } : {}),
  }));

  const judgements = ordered
    .filter((submission) => submission.submissionStatus !== SubmissionStatus.PENDING)
    .map((submission) => {
      const id = submissionId(submission);
      const started = submission.judgedAt ?? submission.submittedAt;
      const ended = submission.judgeEndAt ?? started;
      return {
        id,
        submission_id: id,
        judgement_type_id: judgementTypeId(submission.submissionStatus),
        current: true,
        start_time: formatTime(started),
        start_contest_time: reltime(started),
        end_time: formatTime(ended),
        end_contest_time: reltime(ended),
        ...(isVnoj ? { score: submission.points ?? 0 } : {}),
      };
    });

  const languages = [...new Set(submissions.map((submission) => submission.language_id))]
    .sort()
    .map((id) => ({ id, name: id, entry_point_required: false, extensions: [] as string[] }));

  const judgementTypes = Object.entries(JUDGEMENT_TYPE_NAMES).map(([id, name]) => ({
    id,
    name,
    solved: id === 'AC',
    penalty: !PENALTY_FREE.has(id),
  }));

  return {
    'judgement-types': judgementTypes,
    languages,
    problems,
    organizations,
    teams,
    submissions,
    judgements,
  };
}

export type ClicsCollections = ReturnType<typeof buildCollections>;

export function buildScoreboard(data: ClicsData, now: Date) {
  const isVnoj = data.contest.format === ContestFormat.VNOJ;
  const problems = orderedProblems(data.problems);
  const rows = data.participants
    .filter((participant) => !participant.hidden)
    .sort((a, b) => a.rank - b.rank)
    .map((participant) => ({
      rank: participant.rank,
      team_id: participant.username,
      score: isVnoj
        ? {
            num_solved: participant.solvedCount,
            score: participant.score ?? 0,
            total_time: Math.floor((participant.cumtime ?? 0) / 60),
          }
        : { num_solved: participant.solvedCount, total_time: participant.totalPenalty },
      problems: problems.map((problem) => {
        const result = participant.problemData[problem.code];
        const solved = !!result && participant.solvedProblems.includes(problem.code);
        return {
          problem_id: problem.code,
          num_judged: (result?.wrongTries ?? 0) + (solved ? 1 : 0),
          num_pending: result?.pending ?? 0,
          solved,
          ...(solved ? { time: isVnoj ? Math.floor(result.solveTime / 60) : result.solveTime } : {}),
          ...(isVnoj && result ? { score: result.points ?? 0 } : {}),
        };
      }),
    }));

  return {
    time: formatTime(now),
    contest_time: formatReltime(now.getTime() - data.contest.start_time.getTime()),
    state: buildState(data.contest, now, { finalize: false, hasPending: false }),
    rows,
  };
}

export function filterByIds<T extends Record<string, unknown>>(items: T[], query: Record<string, unknown>): T[] {
  const filters = Object.entries(query).filter(
    (entry): entry is [string, string] => entry[0].endsWith('_id') && typeof entry[1] === 'string',
  );
  return items.filter((item) =>
    filters.every(([key, value]) => (item[key] == null ? '' : String(item[key])) === value),
  );
}
