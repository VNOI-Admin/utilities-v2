import type { ProblemState, RankingFormat } from '~/common/ranking';
import { isDarkText, type VisualConfig } from '../../config';
import type { BroadcastProblem, BroadcastRow } from '../../data';

export const PROBLEM_COLOR_FALLBACK = '#332C48';

export type TaskStatus = 'first' | 'solved' | 'unknown' | 'failed' | 'untouched';

export interface TeamTask {
  index: number;
  problem: BroadcastProblem;
  state: ProblemState;
  status: TaskStatus;
  resultText: string;
  resultColor: string;
  timeText: string;
  firstToSolve: boolean;
}

export function textColorOn(background: string): string {
  return /^#[0-9a-f]{6}$/i.test(background) && isDarkText(background) ? '#000' : '#FFF';
}

export function formatScore(value: number, digits = 2): string {
  return value.toFixed(value - Math.floor(value) > 0 ? digits : 0);
}

export function formatMinutes(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

export function firstSolveTimes(rows: BroadcastRow[]): Map<string, number> {
  const best = new Map<string, number>();
  for (const row of rows) {
    for (const [code, state] of Object.entries(row.problems)) {
      if (!state.solved) continue;
      const current = best.get(code);
      if (current === undefined || state.time < current) best.set(code, state.time);
    }
  }
  return best;
}

const SYMBOLS: Record<TaskStatus, string> = { first: '+', solved: '+', unknown: '?', failed: '-', untouched: '' };

function icpcStatus(state: ProblemState, first: boolean): TaskStatus {
  if (first) return 'first';
  if (state.solved) return 'solved';
  if (state.pending > 0) return 'unknown';
  if (state.tries > 0) return 'failed';
  return 'untouched';
}

export function buildTeamTasks(
  row: BroadcastRow,
  problems: BroadcastProblem[],
  firstTimes: Map<string, number>,
  format: RankingFormat,
  visual: VisualConfig,
): TeamTask[] {
  const colors: Record<TaskStatus, string> = {
    first: visual.VERDICT_OK,
    solved: visual.VERDICT_OK,
    unknown: visual.VERDICT_UNKNOWN,
    failed: visual.VERDICT_NOK,
    untouched: 'transparent',
  };
  return problems.map((problem, index) => {
    const state = row.problems[problem.code] ?? {
      attempted: false,
      solved: false,
      tries: 0,
      time: 0,
      points: 0,
      pending: 0,
    };
    const timeText = state.solved ? formatMinutes(state.time) : '';
    if (format === 'VNOJ') {
      const status: TaskStatus = !state.attempted
        ? 'untouched'
        : state.solved
          ? 'solved'
          : state.pending > 0
            ? 'unknown'
            : 'failed';
      return {
        index,
        problem,
        state,
        status,
        resultText: state.attempted ? formatScore(state.points) : '',
        resultColor: colors[status],
        timeText,
        firstToSolve: false,
      };
    }
    const first = state.solved && firstTimes.get(problem.code) === state.time;
    const status = icpcStatus(state, first);
    const wrong = state.tries - (state.solved ? 1 : 0);
    const attempts = wrong + state.pending;
    return {
      index,
      problem,
      state,
      status,
      resultText: SYMBOLS[status] + (status !== 'untouched' && attempts > 0 ? String(attempts) : ''),
      resultColor: colors[status],
      timeText,
      firstToSolve: first,
    };
  });
}
