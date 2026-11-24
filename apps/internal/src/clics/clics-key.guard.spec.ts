import type { ExecutionContext } from '@nestjs/common';

import { ClicsKeyGuard } from './clics-key.guard';

const run = (key: string | undefined, authorization?: string) => {
  const request: { headers: Record<string, string>; user?: unknown } = {
    headers: authorization ? { authorization } : {},
  };
  const guard = new ClicsKeyGuard({ get: () => key } as never);
  const context = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
  expect(guard.canActivate(context)).toBe(true);
  return request.user;
};

const basic = (user: string, password: string) => `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;

describe('ClicsKeyGuard', () => {
  it('signs in a Basic-auth client whose password is the API key', () => {
    expect(run('s3cret', basic('live', 's3cret'))).toEqual({ sub: 'live', role: 'admin' });
  });

  it('leaves the request to the JWT guard otherwise', () => {
    expect(run('s3cret', basic('live', 'wrong'))).toBeUndefined();
    expect(run('s3cret', basic('live', 's3cret!'))).toBeUndefined();
    expect(run('s3cret', 'Bearer abc')).toBeUndefined();
    expect(run('s3cret')).toBeUndefined();
    expect(run(undefined, basic('live', ''))).toBeUndefined();
    expect(run('', basic('live', ''))).toBeUndefined();
  });
});
