import { ContestFormat } from '../schemas/contest.schema';
import {
  type ProblemSubmissions,
  type ScoringConfig,
  compareForRanking,
  computeParticipantScore,
  rankSort,
} from './contest-scoring';

const start = new Date('2026-11-24T08:00:00Z');
const at = (minutes: number) => new Date(start.getTime() + minutes * 60_000);

const icpc: ScoringConfig = { format: ContestFormat.ICPC, startTime: start, penaltyPerWrong: 20 };

const solve = (problemCode: string, ...subs: [string, number][]): ProblemSubmissions => ({
  problemCode,
  submissions: subs.map(([status, minutes]) => ({ status, submittedAt: at(minutes) })),
});

describe('ICPC scoring', () => {
  it('breaks a solved/penalty tie by the earlier last solve', () => {
    const early = computeParticipantScore([solve('A', ['AC', 10]), solve('B', ['AC', 50])], icpc);
    const late = computeParticipantScore([solve('A', ['AC', 30]), solve('B', ['AC', 30])], icpc);

    expect(early.totalPenalty).toBe(late.totalPenalty);
    expect(early.tiebreaker).toBe(50);
    expect(late.tiebreaker).toBe(30);
    expect(compareForRanking(late, early, ContestFormat.ICPC)).toBeLessThan(0);
  });

  it('builds a frozen view that hides post-freeze submissions as pending', () => {
    const result = computeParticipantScore(
      [solve('A', ['AC', 10]), solve('B', ['WA', 100], ['AC', 250])],
      { ...icpc, frozenAt: at(240) },
    );

    expect(result.solvedCount).toBe(2);
    expect(result.frozen?.solvedCount).toBe(1);
    expect(result.frozen?.totalPenalty).toBe(10);
    expect(result.frozen?.problemData.B).toEqual({ solveTime: 0, wrongTries: 1, pending: 1 });
  });

  it('does not count a pending verdict as a wrong try', () => {
    const result = computeParticipantScore([solve('A', ['WA', 5], ['PENDING', 9])], icpc);

    expect(result.problemData.A).toEqual({ solveTime: 0, wrongTries: 1, pending: 1 });
    expect(result.totalPenalty).toBe(0);
  });

  it('sorts participants by solved, penalty, then last solve', () => {
    expect(rankSort(ContestFormat.ICPC)).toEqual({ solvedCount: -1, totalPenalty: 1, tiebreaker: 1, username: 1 });
    expect(rankSort(ContestFormat.ICPC, true)).toEqual({
      frozenSolvedCount: -1,
      frozenPenalty: 1,
      frozenTiebreaker: 1,
      username: 1,
    });
    expect(rankSort(ContestFormat.VNOJ)).toEqual({ score: -1, cumtime: 1, tiebreaker: 1, username: 1 });
  });
});
