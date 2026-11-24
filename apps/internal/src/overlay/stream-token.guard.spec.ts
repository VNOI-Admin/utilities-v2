import { signStreamToken } from '@libs/common/helper/stream-token';
import type { ExecutionContext } from '@nestjs/common';

import { StreamTokenGuard } from './stream-token.guard';

const run = (headers: Record<string, string>, secret: string | null = 'jwt-secret') => {
  const request: { headers: Record<string, string>; user?: unknown } = { headers };
  const guard = new StreamTokenGuard({ get: () => secret ?? undefined } as never);
  const context = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
  expect(guard.canActivate(context)).toBe(true);
  return request.user;
};

describe('StreamTokenGuard', () => {
  const token = signStreamToken('jwt-secret', '10.10.0.5');

  it('admits a stream request carrying a token for that IP', () => {
    expect(run({ 'x-stream-token': token, 'x-original-uri': '/stream-source/10.10.0.5/' })).toEqual({
      sub: 'stream-token',
      role: 'admin',
    });
  });

  it('leaves everything else to the session guard', () => {
    expect(run({ 'x-stream-token': token, 'x-original-uri': '/stream-source/10.10.0.6/' })).toBeUndefined();
    expect(run({ 'x-original-uri': '/stream-source/10.10.0.5/' })).toBeUndefined();
    expect(run({ 'x-stream-token': token })).toBeUndefined();
    expect(run({ 'x-stream-token': token, 'x-original-uri': '/stream-source/10.10.0.5/' }, null)).toBeUndefined();
  });
});
