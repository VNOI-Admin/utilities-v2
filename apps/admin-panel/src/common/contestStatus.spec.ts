import { contestStatus, isFrozen } from './contestStatus';

const contest = {
  start_time: '2026-11-24T02:00:00Z',
  end_time: '2026-11-24T07:00:00Z',
  frozen_at: '2026-11-24T06:00:00Z',
};
const at = (iso: string) => new Date(iso);

describe('contestStatus', () => {
  it('is upcoming before the start', () => {
    expect(contestStatus(contest, at('2026-11-24T01:00:00Z'))).toBe('upcoming');
  });

  it('is ongoing before the freeze', () => {
    expect(contestStatus(contest, at('2026-11-24T03:00:00Z'))).toBe('ongoing');
  });

  it('is frozen between the freeze and the end', () => {
    expect(contestStatus(contest, at('2026-11-24T06:30:00Z'))).toBe('frozen');
  });

  it('is past once the contest has ended, even with a freeze time', () => {
    expect(contestStatus(contest, at('2026-11-30T00:00:00Z'))).toBe('past');
  });
});

describe('isFrozen', () => {
  it('stays frozen after the end so the broadcast keeps the frozen scoreboard', () => {
    expect(isFrozen(contest, at('2026-11-30T00:00:00Z'))).toBe(true);
  });

  it('is not frozen before the freeze or without a freeze time', () => {
    expect(isFrozen(contest, at('2026-11-24T03:00:00Z'))).toBe(false);
    expect(isFrozen({ ...contest, frozen_at: undefined }, at('2026-11-30T00:00:00Z'))).toBe(false);
  });
});
