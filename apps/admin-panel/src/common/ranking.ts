import type { ParticipantResponse } from '@libs/api/internal';

export type RankingFormat = 'ICPC' | 'VNOJ';

/**
 * Per-problem display state, unified across formats so templates can render one
 * cell shape regardless of the contest's ranking format.
 */
export interface ProblemState {
  attempted: boolean;
  solved: boolean; // VNOJ: scored any points; ICPC: got AC
  tries: number; // Total attempts including the scoring submission
  time: number; // Whole minutes from start to the scoring submission
  points: number; // VNOJ points on this problem (0 for ICPC)
  pending: number; // VNOJ: submissions after the freeze not yet reflected
}

interface RawProblemData {
  solveTime: number;
  wrongTries: number;
  points?: number;
  pending?: number;
}

/**
 * Convert a stored time into the whole minutes the scoreboard displays.
 *
 * VNOJ times are stored in seconds (the judge scores in exact seconds so that
 * same-minute submissions still break ties); ICPC times are already minutes.
 */
export function toDisplayMinutes(value: number, format: RankingFormat): number {
  return format === 'VNOJ' ? Math.floor(value / 60) : value;
}

/** Resolve a contest/participant's ranking format, defaulting to ICPC. */
export function resolveFormat(source?: { format?: string | null } | null): RankingFormat {
  return source?.format === 'VNOJ' ? 'VNOJ' : 'ICPC';
}

export function isVnoj(source?: { format?: string | null } | null): boolean {
  return resolveFormat(source) === 'VNOJ';
}

/** Build the display state for one participant/problem under the given format. */
export function buildProblemState(
  participant: ParticipantResponse,
  problemCode: string,
  format: RankingFormat,
): ProblemState {
  const map = participant.problemData as Record<string, RawProblemData> | undefined;
  const pd = map?.[problemCode];
  if (!pd) {
    return { attempted: false, solved: false, tries: 0, time: 0, points: 0, pending: 0 };
  }

  if (format === 'VNOJ') {
    const points = pd.points ?? 0;
    const scored = points > 0;
    const pending = pd.pending ?? 0;
    const tries = pd.wrongTries + (scored ? 1 : 0);
    return {
      attempted: tries > 0 || pending > 0,
      solved: scored,
      tries,
      time: toDisplayMinutes(pd.solveTime, format),
      points,
      pending,
    };
  }

  const solved = participant.solvedProblems?.includes(problemCode) || false;
  const tries = pd.wrongTries + (solved ? 1 : 0);
  return { attempted: tries > 0, solved, tries, time: solved ? pd.solveTime : 0, points: 0, pending: 0 };
}

/** Primary ranking metric (VNOJ: total score; ICPC: solved count). */
export function primaryMetric(p: ParticipantResponse, format: RankingFormat): number {
  return format === 'VNOJ' ? p.score ?? 0 : p.solvedCount ?? 0;
}

/**
 * Secondary ranking metric in whole minutes (VNOJ: cumulative time incl.
 * penalty; ICPC: penalty). Display only — the stored second-resolution cumtime
 * is what the ranking actually sorts on.
 */
export function secondaryMetric(p: ParticipantResponse, format: RankingFormat): number {
  return format === 'VNOJ' ? toDisplayMinutes(p.cumtime ?? 0, format) : p.totalPenalty ?? 0;
}

/** Header label for the primary metric column. */
export function primaryLabel(format: RankingFormat): string {
  return format === 'VNOJ' ? 'Score' : 'Solved';
}

/** Header label for the secondary metric column. */
export function secondaryLabel(format: RankingFormat): string {
  return format === 'VNOJ' ? 'Time' : 'Penalty';
}
