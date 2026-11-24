import type { ParticipantResponse } from '@libs/api/internal';

import { buildProblemState, standings } from './ranking';

const participant = (overrides: Partial<ParticipantResponse>): ParticipantResponse => ({
  _id: overrides.username ?? 'x',
  username: 'x',
  contest: 'c',
  displayName: 'X',
  solvedCount: 0,
  totalPenalty: 0,
  rank: 0,
  solvedProblems: [],
  problemData: {},
  ...overrides,
});

const alpha = participant({
  username: 'alpha',
  rank: 1,
  solvedCount: 2,
  totalPenalty: 70,
  solvedProblems: ['A', 'B'],
  problemData: { A: { solveTime: 20, wrongTries: 0 }, B: { solveTime: 250, wrongTries: 1 } },
  frozenRank: 2,
  frozenSolvedCount: 1,
  frozenPenalty: 20,
  frozenSolvedProblems: ['A'],
  frozenProblemData: { A: { solveTime: 20, wrongTries: 0 }, B: { solveTime: 0, wrongTries: 1, pending: 1 } },
});
const beta = participant({
  username: 'beta',
  rank: 2,
  solvedCount: 1,
  totalPenalty: 10,
  solvedProblems: ['A'],
  problemData: { A: { solveTime: 10, wrongTries: 0 } },
  frozenRank: 1,
  frozenSolvedCount: 1,
  frozenPenalty: 10,
  frozenSolvedProblems: ['A'],
  frozenProblemData: { A: { solveTime: 10, wrongTries: 0 } },
});
const ghost = participant({ username: 'ghost', rank: 3, hidden: true, frozenRank: 3 });

describe('standings', () => {
  it('drops hidden teams and orders the live board by rank', () => {
    expect(standings([beta, ghost, alpha], false).map((p) => p.username)).toEqual(['alpha', 'beta']);
  });

  it('switches every metric to the frozen board when frozen', () => {
    const [first, second] = standings([alpha, beta, ghost], true);
    expect(first.username).toBe('beta');
    expect(second).toMatchObject({ username: 'alpha', rank: 2, solvedCount: 1, totalPenalty: 20, solvedProblems: ['A'] });
    expect(buildProblemState(second, 'B', 'ICPC')).toEqual({
      attempted: true,
      solved: false,
      tries: 1,
      time: 0,
      points: 0,
      pending: 1,
    });
  });
});

describe('buildProblemState (ICPC)', () => {
  it('reports pending submissions on an unsolved problem', () => {
    const judging = participant({ problemData: { A: { solveTime: 0, wrongTries: 0, pending: 2 } } });
    expect(buildProblemState(judging, 'A', 'ICPC')).toMatchObject({ attempted: true, solved: false, tries: 0, pending: 2 });
  });
});
