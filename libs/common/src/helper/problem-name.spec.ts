import { problemLetters } from './problem-name';

describe('problemLetters', () => {
  it('orders by ordinal then code and prefers the stored label', () => {
    const letters = problemLetters([{ code: 'sum' }, { code: 'graph' }, { code: 'zeta', ordinal: 0, label: 'X' }]);
    expect([...letters]).toEqual([
      ['zeta', 'X'],
      ['graph', 'B'],
      ['sum', 'C'],
    ]);
  });
});
