import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue';
import type { ParticipantResponse } from '@libs/api/internal';
import { internalApi, internalClient } from '~/services/api';
import { isFrozen } from '~/common/contestStatus';
import { buildProblemState, resolveFormat, standings, type ProblemState, type RankingFormat } from '~/common/ranking';
import type { ContestEntity, ProblemEntity } from '~/stores/contests';
import { labelProblems } from '~/utils/problemName';
import type { Medals } from './types';

interface Submission {
  _id: string;
  submittedAt: string | Date;
  author: string;
  authorFullName?: string;
  submissionStatus: string;
  problem_code: string;
}

export interface BroadcastProblem {
  code: string;
  label: string;
  name: string;
}

export type Medal = 'gold' | 'silver' | 'bronze' | null;

export interface BroadcastRow {
  participant: ParticipantResponse;
  username: string;
  name: string;
  groupName?: string;
  groupLogoUrl?: string;
  rank: number;
  medal: Medal;
  solved: number;
  penalty: number;
  problems: Record<string, ProblemState>;
}

export type QueueVerdict = 'AC' | 'REJECTED' | 'PENDING';

export interface QueueRun {
  id: string;
  username: string;
  name: string;
  rank: number | null;
  medal: Medal;
  solved: number | null;
  problem: BroadcastProblem;
  submittedAt: Date;
  status: string;
  verdict: QueueVerdict;
  firstToSolve: boolean;
}

export interface ProblemStatistics {
  problem: BroadcastProblem;
  solved: number;
  pending: number;
  rejected: number;
}

export interface BroadcastData {
  contest: Ref<ContestEntity | null>;
  format: Ref<RankingFormat>;
  problems: Ref<BroadcastProblem[]>;
  rows: Ref<BroadcastRow[]>;
  rowsByUsername: Ref<Map<string, BroadcastRow>>;
  queue: Ref<QueueRun[]>;
  statistics: Ref<ProblemStatistics[]>;
  frozen: Ref<boolean>;
  now: Ref<Date>;
  elapsedMs: Ref<number>;
  remainingMs: Ref<number>;
}

export function medalFor(rank: number, medals: Medals): Medal {
  if (rank <= medals.gold) return 'gold';
  if (rank <= medals.gold + medals.silver) return 'silver';
  if (rank <= medals.gold + medals.silver + medals.bronze) return 'bronze';
  return null;
}

export function formatClock(ms: number, showSeconds = true): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = String(Math.floor(total / 60) % 60).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return showSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`;
}

export function useBroadcastData(contestId: Ref<string>, medals: Ref<Medals>): BroadcastData {
  const contest = ref<ContestEntity | null>(null);
  const rawProblems = ref<ProblemEntity[]>([]);
  const participants = ref<ParticipantResponse[]>([]);
  const submissions = ref<Submission[]>([]);
  const now = ref(new Date());

  const loadContest = async (code: string) => {
    if (!code) return;
    contest.value = (await internalApi.contest.findOne(code)) as ContestEntity;
    rawProblems.value = (await internalApi.contest.getProblems(code)) as ProblemEntity[];
  };
  const loadParticipants = async () => {
    if (!contestId.value) return;
    participants.value = await internalApi.contest.getParticipants(contestId.value);
  };
  const loadSubmissions = async () => {
    if (!contestId.value) return;
    const { data } = await internalClient.get<Submission[]>(`/overlay/submissions/${contestId.value}`, {
      params: { limit: 40 },
    });
    submissions.value = data;
  };
  const safe = (fn: () => Promise<void>) => () => fn().catch((error) => console.error(error));

  watch(
    contestId,
    (code) => {
      contest.value = null;
      participants.value = [];
      submissions.value = [];
      void safe(() => loadContest(code))();
      void safe(loadParticipants)();
      void safe(loadSubmissions)();
    },
    { immediate: true },
  );

  const timers = [
    setInterval(() => (now.value = new Date()), 500),
    setInterval(safe(loadParticipants), 5000),
    setInterval(safe(loadSubmissions), 3000),
    setInterval(safe(() => loadContest(contestId.value)), 60000),
  ];
  onBeforeUnmount(() => timers.forEach(clearInterval));

  const format = computed(() => resolveFormat(contest.value));
  const frozen = computed(() => !!contest.value && isFrozen(contest.value, now.value));

  const problems = computed<BroadcastProblem[]>(() =>
    labelProblems(rawProblems.value).map((problem) => ({
      code: problem.code,
      label: problem.letter,
      name: problem.fullName,
    })),
  );

  const rows = computed<BroadcastRow[]>(() =>
    standings(participants.value, frozen.value).map((participant) => {
      const problemStates: Record<string, ProblemState> = {};
      for (const problem of problems.value) {
        problemStates[problem.code] = buildProblemState(participant, problem.code, format.value);
      }
      return {
        participant,
        username: participant.username,
        name: participant.displayName,
        groupName: participant.groupName,
        groupLogoUrl: participant.groupLogoUrl,
        rank: participant.rank,
        medal: medalFor(participant.rank, medals.value),
        solved: format.value === 'VNOJ' ? participant.score ?? 0 : participant.solvedCount,
        penalty: format.value === 'VNOJ' ? Math.floor((participant.cumtime ?? 0) / 60) : participant.totalPenalty,
        problems: problemStates,
      };
    }),
  );

  const rowsByUsername = computed(() => new Map(rows.value.map((row) => [row.username, row])));

  const firstSolveTime = computed(() => {
    const best = new Map<string, number>();
    for (const row of rows.value) {
      for (const [code, state] of Object.entries(row.problems)) {
        if (state.solved && (!best.has(code) || state.time < (best.get(code) as number))) best.set(code, state.time);
      }
    }
    return best;
  });

  const queue = computed<QueueRun[]>(() => {
    const problemByCode = new Map(problems.value.map((problem) => [problem.code, problem]));
    const freezeAt = contest.value?.frozen_at ? new Date(contest.value.frozen_at).getTime() : null;
    return submissions.value
      .filter((submission) => !rowsByUsername.value.get(submission.author)?.participant.hidden)
      .map((submission) => {
        const row = rowsByUsername.value.get(submission.author);
        const submittedAt = new Date(submission.submittedAt);
        const hidden = frozen.value && freezeAt !== null && submittedAt.getTime() >= freezeAt;
        const status = hidden ? 'PENDING' : submission.submissionStatus;
        const verdict: QueueVerdict = status === 'PENDING' ? 'PENDING' : status === 'AC' ? 'AC' : 'REJECTED';
        const problem = problemByCode.get(submission.problem_code) ?? {
          code: submission.problem_code,
          label: submission.problem_code,
          name: submission.problem_code,
        };
        const state = row?.problems[submission.problem_code];
        return {
          id: submission._id,
          username: submission.author,
          name: row?.name ?? submission.authorFullName ?? submission.author,
          rank: row?.rank ?? null,
          medal: row?.medal ?? null,
          solved: row?.solved ?? null,
          problem,
          submittedAt,
          status,
          verdict,
          firstToSolve:
            verdict === 'AC' && !!state?.solved && firstSolveTime.value.get(submission.problem_code) === state.time,
        };
      });
  });

  const statistics = computed<ProblemStatistics[]>(() =>
    problems.value.map((problem) => {
      let solved = 0;
      let pending = 0;
      let rejected = 0;
      for (const row of rows.value) {
        const state = row.problems[problem.code];
        if (!state?.attempted) continue;
        if (state.solved) solved++;
        else if (state.pending > 0) pending++;
        else rejected++;
      }
      return { problem, solved, pending, rejected };
    }),
  );

  const startMs = computed(() => (contest.value ? new Date(contest.value.start_time).getTime() : 0));
  const endMs = computed(() => (contest.value ? new Date(contest.value.end_time).getTime() : 0));
  const elapsedMs = computed(() => Math.max(0, now.value.getTime() - startMs.value));
  const remainingMs = computed(() => Math.max(0, endMs.value - now.value.getTime()));

  return { contest, format, problems, rows, rowsByUsername, queue, statistics, frozen, now, elapsedMs, remainingMs };
}
