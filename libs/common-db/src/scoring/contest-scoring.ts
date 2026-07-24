import { ContestFormat } from '../schemas/contest.schema';

/**
 * A single submission as consumed by the scoring engine. Mirrors the relevant
 * fields of a stored Submission, normalized so both the sync processor and the
 * internal contest service can share one implementation.
 */
export interface ScoringSubmission {
  status: string; // SubmissionStatus value (AC, WA, ...)
  submittedAt: Date;
  points?: number; // VNOJ points awarded for this submission (may be absent)
}

/** All submissions a participant made on one problem. */
export interface ProblemSubmissions {
  problemCode: string;
  submissions: ScoringSubmission[];
}

/** Per-problem outcome written back onto the participant document. */
export interface ProblemResult {
  solveTime: number; // Minutes from contest start to the scoring submission
  wrongTries: number; // Wrong submissions before the scoring submission
  points?: number; // VNOJ: best points achieved on this problem
  pending?: number; // VNOJ: submissions after the freeze not reflected in the frozen board
}

/** Aggregate metrics for a participant under a single (live or frozen) view. */
export interface AggregateScore {
  solvedCount: number;
  totalPenalty: number;
  solvedProblems: string[];
  problemData: Record<string, ProblemResult>;
  // VNOJ-format metrics (0 for ICPC).
  score: number;
  cumtime: number;
  tiebreaker: number;
}

export interface ParticipantScore extends AggregateScore {
  /** Present only for VNOJ contests that define a freeze time. */
  frozen?: AggregateScore;
}

export interface ScoringConfig {
  format: ContestFormat;
  startTime: Date;
  penaltyPerWrong: number; // Minutes of penalty per wrong submission
  frozenAt?: Date | null; // Submissions at/after this instant are hidden from the frozen board
}

// Statuses that never count as a wrong attempt.
const ICPC_IGNORED = new Set(['CE', 'IE', 'AC']);
const VNOJ_IGNORED = new Set(['CE', 'IE']);

const POINTS_PRECISION = 3;

function minutesFromStart(start: Date, when: Date): number {
  return Math.floor((when.getTime() - start.getTime()) / 60000);
}

function roundScore(value: number): number {
  const factor = 10 ** POINTS_PRECISION;
  return Math.round(value * factor) / factor;
}

/**
 * Compute one participant's aggregate metrics for a single view.
 *
 * When `cutoff` is supplied, submissions at/after it are excluded from scoring
 * (used to build the frozen scoreboard), while `pending` records how many were
 * hidden so the UI can flag problems with unresolved post-freeze activity.
 */
function computeAggregate(
  problems: ProblemSubmissions[],
  config: ScoringConfig,
  cutoff?: Date,
): AggregateScore {
  const { format, startTime, penaltyPerWrong } = config;
  const isVnoj = format === ContestFormat.VNOJ;
  const ignored = isVnoj ? VNOJ_IGNORED : ICPC_IGNORED;

  const problemData: Record<string, ProblemResult> = {};
  const solvedProblems: string[] = [];
  let solvedCount = 0;
  let totalPenalty = 0;
  let score = 0;
  let cumtime = 0;
  let tiebreaker = 0;

  for (const { problemCode, submissions } of problems) {
    // Defensive chronological sort (callers already sort, but this keeps the
    // engine correct in isolation and cheap for the small per-problem lists).
    const ordered = [...submissions].sort(
      (a, b) => a.submittedAt.getTime() - b.submittedAt.getTime(),
    );
    const considered = cutoff
      ? ordered.filter((s) => s.submittedAt.getTime() < cutoff.getTime())
      : ordered;
    const pending = cutoff ? ordered.length - considered.length : 0;

    if (considered.length === 0) {
      // Nothing counts yet, but surface pending post-freeze submissions.
      if (isVnoj && pending > 0) {
        problemData[problemCode] = { solveTime: 0, wrongTries: 0, points: 0, pending };
      }
      continue;
    }

    if (isVnoj) {
      const maxPoints = considered.reduce((max, s) => Math.max(max, s.points ?? 0), 0);

      if (maxPoints > 0) {
        // Earliest submission that reached the best score for this problem.
        const scoringIndex = considered.findIndex((s) => (s.points ?? 0) === maxPoints);
        const solveTime = minutesFromStart(startTime, considered[scoringIndex].submittedAt);
        const wrongTries = considered
          .slice(0, scoringIndex)
          .filter((s) => !ignored.has(s.status)).length;

        problemData[problemCode] = {
          solveTime,
          wrongTries,
          points: maxPoints,
          ...(pending > 0 ? { pending } : {}),
        };
        solvedProblems.push(problemCode);
        solvedCount++;
        score += maxPoints;
        const penalty = solveTime + wrongTries * penaltyPerWrong;
        cumtime += penalty;
        totalPenalty += penalty;
        tiebreaker = Math.max(tiebreaker, solveTime);
      } else {
        const wrongTries = considered.filter((s) => !ignored.has(s.status)).length;
        problemData[problemCode] = {
          solveTime: 0,
          wrongTries,
          points: 0,
          ...(pending > 0 ? { pending } : {}),
        };
      }
    } else {
      // ICPC: first AC solves the problem; number of solved problems ranks.
      const firstACIndex = considered.findIndex((s) => s.status === 'AC');

      if (firstACIndex !== -1) {
        const solveTime = minutesFromStart(startTime, considered[firstACIndex].submittedAt);
        const wrongTries = considered
          .slice(0, firstACIndex)
          .filter((s) => !ignored.has(s.status)).length;

        problemData[problemCode] = { solveTime, wrongTries };
        solvedProblems.push(problemCode);
        solvedCount++;
        totalPenalty += solveTime + wrongTries * penaltyPerWrong;
      } else {
        const wrongTries = considered.filter((s) => !ignored.has(s.status)).length;
        if (wrongTries > 0) {
          problemData[problemCode] = { solveTime: 0, wrongTries };
        }
      }
    }
  }

  return {
    solvedCount,
    totalPenalty,
    solvedProblems,
    problemData,
    score: roundScore(score),
    cumtime,
    tiebreaker,
  };
}

/**
 * Compare two participants for ranking. Returns a negative number when `a`
 * ranks strictly above `b`, positive when below, and 0 when tied.
 *
 * - VNOJ: higher score, then lower cumtime, then lower tiebreaker.
 * - ICPC: more solved problems, then lower total penalty.
 */
export function compareForRanking(a: AggregateScore, b: AggregateScore, format: ContestFormat): number {
  if (format === ContestFormat.VNOJ) {
    if (b.score !== a.score) return b.score - a.score;
    if (a.cumtime !== b.cumtime) return a.cumtime - b.cumtime;
    return a.tiebreaker - b.tiebreaker;
  }
  if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
  return a.totalPenalty - b.totalPenalty;
}

/** Baseline metrics for a participant with no scoring submissions. */
export function emptyAggregate(): AggregateScore {
  return {
    solvedCount: 0,
    totalPenalty: 0,
    solvedProblems: [],
    problemData: {},
    score: 0,
    cumtime: 0,
    tiebreaker: 0,
  };
}

/**
 * Score a participant. For VNOJ contests with a freeze time, a second frozen
 * view (submissions before `frozenAt` only) is computed alongside the live one.
 */
export function computeParticipantScore(
  problems: ProblemSubmissions[],
  config: ScoringConfig,
): ParticipantScore {
  const live = computeAggregate(problems, config);

  if (config.format === ContestFormat.VNOJ && config.frozenAt) {
    const frozen = computeAggregate(problems, config, config.frozenAt);
    return { ...live, frozen };
  }

  return live;
}

/**
 * Order two participants exactly the way the scoreboard does: by the format's
 * ranking rules, then by username so that tied participants still get a stable,
 * reproducible order. Without the username tiebreak the database sort and the
 * in-memory replay could disagree on who occupies which of two tied rows.
 */
export function compareForScoreboard(
  a: { agg: AggregateScore; username: string },
  b: { agg: AggregateScore; username: string },
  format: ContestFormat,
): number {
  const byRank = compareForRanking(a.agg, b.agg, format);
  if (byRank !== 0) return byRank;
  return a.username < b.username ? -1 : a.username > b.username ? 1 : 0;
}

/** One submission as consumed by the rank replay. */
export interface RankReplaySubmission {
  id: string;
  author: string;
  problemCode: string;
  status: string;
  submittedAt: Date;
  points?: number;
}

/** The author's scoreboard position immediately before and after a submission. */
export interface RankReplayResult {
  id: string;
  oldRank: number;
  newRank: number;
}

/**
 * Replay every submission in chronological order and report the author's
 * scoreboard position immediately before and after each one.
 *
 * Ranks are *scoreboard positions* (1..N, every participant on their own row),
 * not competition ranks that share a number between tied participants. This is
 * deliberate: with shared ranks every participant who has not scored yet sits on
 * the same row, so a submission that lifts someone from the bottom of the field
 * into the top ten reports "no change" — the whole point of the snapshot is to
 * capture that jump. Ordering matches `compareForScoreboard`, so these numbers
 * line up with the ranks written onto the participant documents.
 *
 * Every submission is replayed, not just accepted ones: any verdict that moves
 * points (a partial in VNOJ format, a wrong try adding penalty in ICPC format)
 * can move the author and therefore everyone ranked around them.
 */
export function replaySubmissionRanks(
  submissions: RankReplaySubmission[],
  participantUsernames: string[],
  config: ScoringConfig,
): RankReplayResult[] {
  const { format } = config;
  // Snapshots are freeze-agnostic: they describe the live standings at the
  // moment of the submission, not what a frozen scoreboard would have shown.
  const liveConfig: ScoringConfig = { ...config, frozenAt: null };

  interface AuthorState {
    username: string;
    problems: Map<string, ScoringSubmission[]>;
    agg: AggregateScore;
  }

  const states = new Map<string, AuthorState>();
  const stateOf = (username: string): AuthorState => {
    let state = states.get(username);
    if (!state) {
      state = { username, problems: new Map(), agg: emptyAggregate() };
      states.set(username, state);
    }
    return state;
  };

  // Seed the whole registered field so positions are counted against every
  // participant, not only those who have submitted so far.
  for (const username of participantUsernames) {
    stateOf(username);
  }

  const positionOf = (self: AuthorState): number => {
    let ahead = 0;
    for (const other of states.values()) {
      if (other === self) continue;
      if (compareForScoreboard(other, self, format) < 0) ahead++;
    }
    return ahead + 1;
  };

  const ordered = [...submissions].sort(
    (a, b) => a.submittedAt.getTime() - b.submittedAt.getTime(),
  );

  return ordered.map((submission) => {
    // An author missing from the participant list still gets tracked, otherwise
    // their submissions would rank against a field they are not part of.
    const state = stateOf(submission.author);

    const oldRank = positionOf(state);

    const problemSubs = state.problems.get(submission.problemCode) ?? [];
    problemSubs.push({
      status: submission.status,
      submittedAt: submission.submittedAt,
      points: submission.points,
    });
    state.problems.set(submission.problemCode, problemSubs);

    const problems: ProblemSubmissions[] = Array.from(state.problems.entries()).map(
      ([problemCode, submissionsList]) => ({ problemCode, submissions: submissionsList }),
    );
    state.agg = computeParticipantScore(problems, liveConfig);

    const newRank = positionOf(state);

    return { id: submission.id, oldRank, newRank };
  });
}
