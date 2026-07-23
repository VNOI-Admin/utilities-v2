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
