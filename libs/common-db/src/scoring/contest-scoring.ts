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
  solveTime: number; // Time from contest start to the scoring submission (see TIME UNITS)
  wrongTries: number; // Wrong submissions before the scoring submission
  points?: number; // VNOJ: best points achieved on this problem
  pending?: number; // VNOJ: submissions after the freeze not reflected in the frozen board
}

/**
 * Aggregate metrics for a participant under a single (live or frozen) view.
 * `totalPenalty`, `cumtime` and `tiebreaker` are all expressed in the format's
 * time unit — minutes for ICPC, seconds for VNOJ. See TIME UNITS below.
 */
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
  // Minutes charged per counted attempt. Resolve it with resolvePenaltyMinutes()
  // rather than defaulting inline — the default differs per format.
  penaltyPerWrong: number;
  frozenAt?: Date | null; // Submissions at/after this instant are hidden from the frozen board
  // VNOJ only — Last Submission Only. See computeAggregate for what it changes.
  lso?: boolean;
}

// Statuses that never count as a wrong attempt.
const ICPC_IGNORED = new Set(['CE', 'IE', 'AC']);
const VNOJ_IGNORED = new Set(['CE', 'IE']);

const POINTS_PRECISION = 3;

/**
 * TIME UNITS — deliberately different per format, matching the judge:
 *
 * - ICPC works in whole minutes (`int(dt_seconds // 60)`), so a penalty of N
 *   minutes is simply `tries * N`.
 * - VNOJ works in exact seconds (`total_seconds()`), so a penalty of N minutes
 *   is `tries * N * 60`.
 *
 * The distinction matters for more than presentation: flooring VNOJ times to
 * minutes collapses participants whose scoring submissions land in the same
 * minute into a tie the judge would have separated, and then resolves them by
 * the wrong tiebreak.
 */
function elapsed(start: Date, when: Date, format: ContestFormat): number {
  const seconds = (when.getTime() - start.getTime()) / 1000;
  return format === ContestFormat.VNOJ ? seconds : Math.floor(seconds / 60);
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
 *
 * VNOJ's `lso` (Last Submission Only) switches the cumulative time from the sum
 * of every problem's scoring time to just the latest one — attempt penalties are
 * still added on top either way, and the tiebreaker is that latest time
 * regardless of the setting.
 */
function computeAggregate(
  problems: ProblemSubmissions[],
  config: ScoringConfig,
  cutoff?: Date,
): AggregateScore {
  const { format, startTime, penaltyPerWrong, lso } = config;
  const isVnoj = format === ContestFormat.VNOJ;
  const ignored = isVnoj ? VNOJ_IGNORED : ICPC_IGNORED;
  // Charged per counted attempt, in the format's own time unit (see TIME UNITS).
  const penaltyPerTry = isVnoj ? penaltyPerWrong * 60 : penaltyPerWrong;

  const problemData: Record<string, ProblemResult> = {};
  const solvedProblems: string[] = [];
  let solvedCount = 0;
  let score = 0;
  // Kept apart so LSO can swap the time component without disturbing penalties.
  let solveTimeTotal = 0;
  let penaltyTotal = 0;
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
        const solveTime = elapsed(startTime, considered[scoringIndex].submittedAt, format);
        // Every attempt before the scoring one is charged, not only the failing
        // ones: a partial that raised the score still cost an attempt.
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
        solveTimeTotal += solveTime;
        penaltyTotal += wrongTries * penaltyPerTry;
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
        const solveTime = elapsed(startTime, considered[firstACIndex].submittedAt, format);
        const wrongTries = considered
          .slice(0, firstACIndex)
          .filter((s) => !ignored.has(s.status)).length;

        problemData[problemCode] = { solveTime, wrongTries };
        solvedProblems.push(problemCode);
        solvedCount++;
        solveTimeTotal += solveTime;
        penaltyTotal += wrongTries * penaltyPerTry;
      } else {
        const wrongTries = considered.filter((s) => !ignored.has(s.status)).length;
        if (wrongTries > 0) {
          problemData[problemCode] = { solveTime: 0, wrongTries };
        }
      }
    }
  }

  // LSO counts only the latest scoring submission; otherwise every problem's
  // scoring time is summed. Clamped like the judge does, since a submission
  // recorded before the official start would contribute a negative time.
  const timeBase = isVnoj && lso ? tiebreaker : solveTimeTotal;
  const total = Math.max(timeBase + penaltyTotal, 0);

  return {
    solvedCount,
    totalPenalty: total,
    solvedProblems,
    problemData,
    score: roundScore(score),
    cumtime: isVnoj ? total : 0,
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
