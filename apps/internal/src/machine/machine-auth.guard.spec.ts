import { deriveAgentAuthKey, signAgentAuth } from '@libs/common/remote-control/agent-auth';
import { MachineHmacGuard } from './machine-auth.guard';

const MACHINE = 'machine-1';
const PRIVATE_KEY = Buffer.alloc(32, 7).toString('base64');
const OTHER_KEY = Buffer.alloc(32, 9).toString('base64');
const PATH = '/machine/luks-escrow';
const NOW_S = 1780000000;

function makeUserModel(user: Record<string, unknown> | null) {
  return {
    findOne: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(user) }),
    }),
  };
}

const machineUser = { username: MACHINE, keyPair: { privateKey: PRIVATE_KEY } };

function makeRequest(headers: Record<string, string>, body: Buffer) {
  return { headers, method: 'POST', originalUrl: PATH, rawBody: body };
}

function makeContext(request: Record<string, unknown>) {
  return { switchToHttp: () => ({ getRequest: () => request }) };
}

function signedHeaders(
  privateKey: string,
  body: Buffer,
  options: { timestampOffsetSeconds?: number; path?: string; machine?: string } = {},
) {
  const timestamp = String(NOW_S + (options.timestampOffsetSeconds ?? 0));
  return {
    'x-vnoi-machine': options.machine ?? MACHINE,
    'x-vnoi-timestamp': timestamp,
    'x-vnoi-signature': signAgentAuth(
      deriveAgentAuthKey(privateKey),
      timestamp,
      'POST',
      options.path ?? PATH,
      body,
    ),
  };
}

const BODY = Buffer.from(JSON.stringify({ recoveryPassphrase: 's3cret' }));

describe('MachineHmacGuard', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(NOW_S * 1000));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('accepts a request signed with the machine WireGuard key and marks the machine', async () => {
    const guard = new MachineHmacGuard(makeUserModel(machineUser) as any);
    const request = makeRequest(signedHeaders(PRIVATE_KEY, BODY), BODY);

    await expect(guard.canActivate(makeContext(request) as any)).resolves.toBe(true);
    expect(request['machine']).toBe(MACHINE);
  });

  it('accepts a timestamp exactly on the window edge', async () => {
    const guard = new MachineHmacGuard(makeUserModel(machineUser) as any);
    const request = makeRequest(signedHeaders(PRIVATE_KEY, BODY, { timestampOffsetSeconds: -60 }), BODY);

    await expect(guard.canActivate(makeContext(request) as any)).resolves.toBe(true);
  });

  it('rejects a signature made with another key', async () => {
    const guard = new MachineHmacGuard(makeUserModel(machineUser) as any);
    const request = makeRequest(signedHeaders(OTHER_KEY, BODY), BODY);

    await expect(guard.canActivate(makeContext(request) as any)).rejects.toThrow('Invalid machine authentication');
    expect(request['machine']).toBeUndefined();
  });

  it('rejects a body that differs from the signed one', async () => {
    const guard = new MachineHmacGuard(makeUserModel(machineUser) as any);
    const request = makeRequest(signedHeaders(PRIVATE_KEY, BODY), Buffer.from('{"recoveryPassphrase":"tampered"}'));

    await expect(guard.canActivate(makeContext(request) as any)).rejects.toThrow('Invalid machine authentication');
  });

  it('rejects a path that differs from the signed one', async () => {
    const guard = new MachineHmacGuard(makeUserModel(machineUser) as any);
    const request = makeRequest(signedHeaders(PRIVATE_KEY, BODY, { path: '/machine/other' }), BODY);

    await expect(guard.canActivate(makeContext(request) as any)).rejects.toThrow('Invalid machine authentication');
  });

  it('rejects a stale timestamp', async () => {
    const guard = new MachineHmacGuard(makeUserModel(machineUser) as any);
    const request = makeRequest(signedHeaders(PRIVATE_KEY, BODY, { timestampOffsetSeconds: -61 }), BODY);

    await expect(guard.canActivate(makeContext(request) as any)).rejects.toThrow('Invalid machine authentication');
  });

  it('rejects a timestamp too far in the future', async () => {
    const guard = new MachineHmacGuard(makeUserModel(machineUser) as any);
    const request = makeRequest(signedHeaders(PRIVATE_KEY, BODY, { timestampOffsetSeconds: 61 }), BODY);

    await expect(guard.canActivate(makeContext(request) as any)).rejects.toThrow('Invalid machine authentication');
  });

  it('rejects a non-numeric timestamp before touching the database', async () => {
    const userModel = makeUserModel(machineUser);
    const guard = new MachineHmacGuard(userModel as any);
    const request = {
      headers: {
        'x-vnoi-machine': MACHINE,
        'x-vnoi-timestamp': 'now',
        'x-vnoi-signature': 'aa',
      },
      method: 'POST',
      originalUrl: PATH,
      rawBody: BODY,
    };

    await expect(guard.canActivate(makeContext(request) as any)).rejects.toThrow('Invalid machine authentication');
    expect(userModel.findOne).not.toHaveBeenCalled();
  });

  it('rejects missing headers', async () => {
    const guard = new MachineHmacGuard(makeUserModel(machineUser) as any);

    const cases: Array<Record<string, string>> = [
      {},
      { 'x-vnoi-timestamp': String(NOW_S), 'x-vnoi-signature': 'aa' },
      { 'x-vnoi-machine': MACHINE, 'x-vnoi-signature': 'aa' },
      { 'x-vnoi-machine': MACHINE, 'x-vnoi-timestamp': String(NOW_S) },
    ];
    for (const headers of cases) {
      const request = makeRequest(headers, BODY);
      await expect(guard.canActivate(makeContext(request) as any)).rejects.toThrow(
        'Invalid machine authentication',
      );
    }
  });

  it('rejects an unknown machine', async () => {
    const guard = new MachineHmacGuard(makeUserModel(null) as any);
    const request = makeRequest(signedHeaders(PRIVATE_KEY, BODY, { machine: 'ghost' }), BODY);

    await expect(guard.canActivate(makeContext(request) as any)).rejects.toThrow('Invalid machine authentication');
  });

  it('rejects a machine whose WireGuard private key is absent', async () => {
    const guard = new MachineHmacGuard(makeUserModel({ username: MACHINE, keyPair: { privateKey: null } }) as any);
    const request = makeRequest(signedHeaders(PRIVATE_KEY, BODY), BODY);

    await expect(guard.canActivate(makeContext(request) as any)).rejects.toThrow('Invalid machine authentication');
  });

  it('rejects a replayed request', async () => {
    const guard = new MachineHmacGuard(makeUserModel(machineUser) as any);
    const headers = signedHeaders(PRIVATE_KEY, BODY);

    await expect(guard.canActivate(makeContext(makeRequest(headers, BODY)) as any)).resolves.toBe(true);
    await expect(guard.canActivate(makeContext(makeRequest(headers, BODY)) as any)).rejects.toThrow(
      'Invalid machine authentication',
    );
  });

  it('accepts a new request with a different timestamp after a replay', async () => {
    const guard = new MachineHmacGuard(makeUserModel(machineUser) as any);

    await expect(guard.canActivate(makeContext(makeRequest(signedHeaders(PRIVATE_KEY, BODY), BODY)) as any)).resolves
      .toBe(true);
    await expect(guard.canActivate(makeContext(makeRequest(signedHeaders(PRIVATE_KEY, BODY), BODY)) as any)).rejects
      .toThrow('Invalid machine authentication');

    await expect(
      guard.canActivate(makeContext(makeRequest(signedHeaders(PRIVATE_KEY, BODY, { timestampOffsetSeconds: 1 }), BODY)) as any),
    ).resolves.toBe(true);
  });
});
