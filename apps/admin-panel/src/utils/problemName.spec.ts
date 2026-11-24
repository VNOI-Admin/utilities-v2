import { labelProblems, problemLetter, problemTitle } from './problemName';

describe('problemLetter', () => {
  it('counts A..Z then AA', () => {
    expect([0, 1, 25, 26, 27].map(problemLetter)).toEqual(['A', 'B', 'Z', 'AA', 'AB']);
  });
});

describe('labelProblems', () => {
  it('orders by ordinal then code and prefers the stored label', () => {
    const labelled = labelProblems([
      { code: 'sum', displayName: 'Two Sum' },
      { code: 'graph', name: 'Shortest Path' },
      { code: 'zeta', ordinal: 0, label: 'X' },
    ]);
    expect(labelled.map((p) => [p.code, p.letter, p.fullName])).toEqual([
      ['zeta', 'X', 'zeta'],
      ['graph', 'B', 'Shortest Path'],
      ['sum', 'C', 'Two Sum'],
    ]);
  });
});

describe('problemTitle', () => {
  it('puts the full name beside the letter unless they match', () => {
    expect(problemTitle('A', 'Two Sum')).toBe('A · Two Sum');
    expect(problemTitle('A', 'A')).toBe('A');
  });
});
