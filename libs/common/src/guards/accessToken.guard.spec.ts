import { UnauthorizedException } from '@nestjs/common';

import { Role } from '../decorators/role.decorator';
import { AccessTokenGuard } from './accessToken.guard';
import { IPAddressGuard } from './ipAddress.guard';

const userModel = (users: Record<string, { username: string; role: Role }>) => ({
  findOne: (q: { username?: string; vpnIpAddress?: string }) => ({
    lean: async () => Object.values(users).find((u) => u.username === q.username || q.vpnIpAddress === '10.2.0.5') ?? null,
  }),
});

const reflector = (roles: Role[], optional: boolean) => ({
  get: () => roles,
  getAllAndOverride: (key: string) => (key === 'roles' ? roles : optional),
});

const context = (req: any) => ({
  switchToHttp: () => ({ getRequest: () => req }),
  getHandler: () => undefined,
  getClass: () => undefined,
});

async function runChain(token: string | undefined, users: Record<string, { username: string; role: Role }>) {
  const req: any = { headers: token ? { authorization: `Bearer ${token}` } : {}, ip: '10.9.9.9' };
  const jwt = { verifyAsync: async (t: string) => ({ sub: t }) };
  const config = { get: () => 'secret' };
  const refl = reflector([Role.ADMIN, Role.CONTESTANT], true);
  const model = userModel(users);
  const ctx = context(req) as any;
  const ok =
    (await new AccessTokenGuard(jwt as any, config as any, refl as any, model as any).canActivate(ctx)) &&
    (await new IPAddressGuard(refl as any, model as any).canActivate(ctx));
  return { ok, req };
}

describe('AccessTokenGuard with AccessTokenOptional', () => {
  const users = {
    coach: { username: 'coach', role: Role.COACH },
    alice: { username: 'alice', role: Role.CONTESTANT },
  };

  it('does not let a token with a disallowed role through the IP guard', async () => {
    await expect(runChain('coach', users)).rejects.toThrow(UnauthorizedException);
  });

  it('accepts a token with an allowed role', async () => {
    const { ok, req } = await runChain('alice', users);
    expect(ok).toBe(true);
    expect(req.user).toEqual({ sub: 'alice' });
  });
});
