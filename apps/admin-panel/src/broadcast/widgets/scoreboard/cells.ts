import type { ProblemState, RankingFormat } from '~/common/ranking';
import { isDarkText, type VisualConfig } from '../../config';
import type { BroadcastRow, Medal } from '../../data';

export interface TaskCell {
  text: string;
  color?: string;
  first: boolean;
}

export function formatScore(score: number, digits = 2): string {
  return score.toFixed(score - Math.floor(score) > 0 ? digits : 0);
}

export function formatRank(rank: number | null | undefined): string {
  if (rank === null || rank === undefined) return '??';
  return rank === 0 ? '*' : String(rank);
}

export function rankStyle(medal: Medal, visual: VisualConfig) {
  const background = medal ? visual.MEDAL_COLORS[medal] : undefined;
  return {
    backgroundColor: background ?? 'transparent',
    color: background && isDarkText(background) ? '#000' : '#FFF',
    borderRadius: background ? visual.VERDICT_CELL_BORDER_RADIUS : undefined,
  };
}

export function firstSolveTimes(rows: BroadcastRow[], format: RankingFormat): Map<string, number> {
  const best = new Map<string, number>();
  if (format !== 'ICPC') return best;
  for (const row of rows) {
    for (const [code, state] of Object.entries(row.problems)) {
      if (state.solved && (!best.has(code) || state.time < (best.get(code) as number))) best.set(code, state.time);
    }
  }
  return best;
}

export function taskCell(
  state: ProblemState | undefined,
  format: RankingFormat,
  firstTime: number | undefined,
  visual: VisualConfig,
): TaskCell {
  if (!state || !state.attempted) return { text: '', first: false };
  if (format === 'VNOJ') {
    const color = state.pending > 0 ? visual.VERDICT_UNKNOWN : state.solved ? visual.VERDICT_OK : visual.VERDICT_NOK;
    const text = state.pending > 0 && state.points === 0 ? '?' : formatScore(state.points);
    return { text, color, first: false };
  }
  const attempts = state.tries - (state.solved ? 1 : 0) + state.pending;
  const suffix = attempts > 0 ? String(attempts) : '';
  if (state.solved) return { text: `+${suffix}`, color: visual.VERDICT_OK, first: state.time === firstTime };
  if (state.pending > 0) return { text: `?${suffix}`, color: visual.VERDICT_UNKNOWN, first: false };
  return { text: `-${suffix}`, color: visual.VERDICT_NOK, first: false };
}
