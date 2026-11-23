import { UnauthorizedException } from '@nestjs/common';

import { Role } from '../decorators/role.decorator';
import { AccessTokenGuard } from './accessToken.guard';
import { getCoachAccessStatus } from './coachAccess';

type Query = { frozen_at: { $lte?: Date; $gt?: Date } };

const fakeDb = (freezes: string[], reopenedAt?: string) => ({
  models: {
    Contest: {
      findOne: (q: Query) => ({
        sort: (s: { frozen_at: 1 | -1 }) => ({
          lean: async () => {
            const hits = freezes
              .map((f) => new Date(f))
              .filter((f) => (q.frozen_at.$lte ? f <= q.frozen_at.$lte : f > (q.frozen_at.$gt as Date)))
              .sort((a, b) => (a.getTime() - b.getTime()) * s.frozen_at);
            return hits.length ? { frozen_at: hits[0] } : null;
          },
        }),
      }),
    },
    SystemConfig: { findOne: () => ({ lean: async () => (reopenedAt ? { value: reopenedAt } : null) }) },
  },
});

const now = new Date('2026-11-24T13:30:00Z');

describe('getCoachAccessStatus', () => {
  it('is open before any freeze and reports the next freeze', async () => {
    const s = await getCoachAccessStatus(fakeDb(['2026-11-24T14:00:00Z']) as any, now);
    expect(s.locked).toBe(false);
    expect(s.nextFreezeAt).toEqual(new Date('2026-11-24T14:00:00Z'));
  });

  it('locks from frozen_at when nobody reopened it', async () => {
    const s = await getCoachAccessStatus(fakeDb(['2026-11-24T13:00:00Z']) as any, now);
    expect(s.locked).toBe(true);
  });

  it('stays locked when the last reopen happened before this freeze', async () => {
    const s = await getCoachAccessStatus(
      fakeDb(['2026-11-10T13:00:00Z', '2026-11-24T13:00:00Z'], '2026-11-10T18:00:00Z') as any,
      now,
    );
    expect(s.locked).toBe(true);
  });

  it('opens again once an admin reopens after the freeze', async () => {
    const s = await getCoachAccessStatus(fakeDb(['2026-11-24T13:00:00Z'], '2026-11-24T13:20:00Z') as any, now);
    expect(s.locked).toBe(false);
  });
});

describe('AccessTokenGuard during a scoreboard freeze', () => {
  const guardFor = (role: Role, db: unknown) => {
    const user = { username: 'u', role, isActive: true };
    const userModel = { db, findOne: () => ({ lean: async () => user }) };
    return new AccessTokenGuard(
      { verifyAsync: async () => ({ sub: 'u' }) } as any,
      { get: () => 'secret' } as any,
      { get: () => [Role.ADMIN, Role.COACH], getAllAndOverride: () => false } as any,
      userModel as any,
    );
  };
  const ctx = () =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ headers: { authorization: 'Bearer t' } }) }),
      getHandler: () => undefined,
      getClass: () => undefined,
    }) as any;

  it('rejects a coach once the scoreboard is frozen', async () => {
    const frozen = fakeDb([new Date(Date.now() - 60_000).toISOString()]);
    await expect(guardFor(Role.COACH, frozen).canActivate(ctx())).rejects.toThrow(UnauthorizedException);
  });

  it('lets a coach in before the freeze', async () => {
    const later = fakeDb([new Date(Date.now() + 60_000).toISOString()]);
    await expect(guardFor(Role.COACH, later).canActivate(ctx())).resolves.toBe(true);
  });

  it('never locks out an admin', async () => {
    const frozen = fakeDb([new Date(Date.now() - 60_000).toISOString()]);
    await expect(guardFor(Role.ADMIN, frozen).canActivate(ctx())).resolves.toBe(true);
  });
});
