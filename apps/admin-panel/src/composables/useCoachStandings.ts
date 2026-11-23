import type { ParticipantResponse } from '@libs/api/internal';
import { useLocalStorage } from '@vueuse/core';
import { type RankingFormat, buildProblemState, resolveFormat } from '~/common/ranking';
import { internalApi } from '~/services/api';
import { resolveProblemName } from '~/utils/problemName';

export interface StandingsProblem {
  code: string;
  label: string;
}

export interface ProblemCell {
  code: string;
  label: string;
  format: RankingFormat;
  state: 'solved' | 'tried' | 'none';
  solveTime: number;
  tries: number;
  points: number;
  pending: number;
}

const pins = useLocalStorage<string[]>('coach-view:pins', []);

export function useCoachPins() {
  const isPinned = (username: string) => pins.value.includes(username);
  const togglePin = (username: string) => {
    pins.value = isPinned(username) ? pins.value.filter((u) => u !== username) : [...pins.value, username];
  };
  return { pins, isPinned, togglePin };
}

export async function fetchStandings(contestCode: string) {
  const [participants, problems] = await Promise.all([
    internalApi.contest.getParticipants(contestCode),
    internalApi.contest.getProblems(contestCode) as Promise<{ code: string; displayName?: string }[]>,
  ]);
  const sorted = [...problems].sort((a, b) => a.code.localeCompare(b.code));
  const standingsProblems: StandingsProblem[] = sorted.map((p, i) => {
    const name = resolveProblemName(p.code, p.displayName);
    return { code: p.code, label: name !== p.code ? name : String.fromCharCode(65 + i) };
  });
  const byUser = new Map<string, ParticipantResponse>();
  for (const p of participants) if (p.mapToUser) byUser.set(p.mapToUser, p);
  return { problems: standingsProblems, byUser };
}

export function problemCells(participant: ParticipantResponse | undefined, problems: StandingsProblem[]): ProblemCell[] {
  const format = resolveFormat(participant);
  return problems.map(({ code, label }) => {
    const s = participant ? buildProblemState(participant, code, format) : undefined;
    return {
      code,
      label,
      format,
      state: s?.solved ? 'solved' : s?.attempted ? 'tried' : 'none',
      solveTime: s?.time ?? 0,
      tries: s?.tries ?? 0,
      points: s?.points ?? 0,
      pending: s?.pending ?? 0,
    };
  });
}

export function lastSolve(cells: ProblemCell[]): ProblemCell | undefined {
  return cells.filter((c) => c.state === 'solved').sort((a, b) => b.solveTime - a.solveTime)[0];
}

export function cellClass(cell: ProblemCell): string {
  if (cell.state === 'solved') return 'bg-mission-ok/80 text-mission-ink';
  if (cell.state === 'tried') return 'bg-mission-red/70 text-mission-ink';
  return 'bg-mission-gray text-mission-muted';
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function cellTitle(cell: ProblemCell): string {
  if (cell.state === 'none') return `${cell.code}: not tried`;
  if (cell.format === 'VNOJ') {
    const pending = cell.pending ? `, ${cell.pending} pending` : '';
    if (cell.state === 'solved') return `${cell.code}: ${plural(cell.points, 'point', 'points')} at ${cell.solveTime}′${pending}`;
    return `${cell.code}: 0 points${cell.tries ? ` after ${plural(cell.tries, 'try', 'tries')}` : ''}${pending}`;
  }
  if (cell.state === 'solved') return `${cell.code}: solved at ${cell.solveTime}′`;
  return `${cell.code}: ${plural(cell.tries, 'wrong try', 'wrong tries')}`;
}
