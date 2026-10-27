import { generateKeyPairSync, type KeyObject, sign } from 'crypto';
import { Readable, Writable } from 'stream';
import { MachineStatus } from '@libs/common-db/schemas/machine.schema';
import { ForbiddenException } from '@nestjs/common';

import { Role } from '../decorators/role.decorator';
import { machineFingerprint, machineMessage } from '../machine/machine-auth';
import { MachineAuthService } from '../machine/machine-auth.service';
import { ApprovedMachineGuard, MachineGuard } from './machine.guard';

const PATH = '/internal/contests/current';

function machineKey() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const raw = Buffer.from(publicKey.export({ format: 'jwk' }).x as string, 'base64url');
  return { raw, privateKey, fingerprint: machineFingerprint(raw) };
}

const known = machineKey();
const stranger = machineKey();

const users: Record<string, { role: Role }> = {
  alice: { role: Role.CONTESTANT },
  guest_001: { role: Role.GUEST },
  root: { role: Role.ADMIN },
  coach: { role: Role.COACH },
};

function setup({ status = MachineStatus.APPROVED, required = true } = {}) {
  const machines = [{ fingerprint: known.fingerprint, publicKey: known.raw.toString('base64'), status }];
  const nonces = new Map<string, number>();
  const machineModel = {
    findOne: (q: { fingerprint: string }) => ({
      lean: async () => machines.find((m) => m.fingerprint === q.fingerprint) ?? null,
    }),
  };
  const nonceModel = {
    create: async (doc: { nonce: string; expiresAt: Date }) => nonces.set(doc.nonce, doc.expiresAt.getTime()),
    findOneAndDelete: (q: { nonce: string; expiresAt: { $gt: Date } }) => ({
      lean: async () => {
        const expiresAt = nonces.get(q.nonce);
        if (expiresAt === undefined || expiresAt <= q.expiresAt.$gt.getTime()) return null;
        nonces.delete(q.nonce);
        return { nonce: q.nonce };
      },
    }),
  };
  const userModel = {
    findOne: (q: { username: string }) => ({ select: () => ({ lean: async () => users[q.username] ?? null }) }),
  };
  const config = { get: (k: string) => (k === 'MACHINE_AUTH_REQUIRED' ? String(required) : undefined) };
  const auth = new MachineAuthService(machineModel as any, nonceModel as any, config as any);
  return { auth, guard: new MachineGuard(auth, userModel as any) };
}

type Signed = {
  signer?: { privateKey: KeyObject; fingerprint: string };
  nonce?: string;
  method?: string;
  path?: string;
  body?: string;
  sentPath?: string;
  sentBody?: string;
  user?: unknown;
};

async function signedRequest(auth: MachineAuthService, opts: Signed = {}) {
  const signer = opts.signer ?? known;
  const nonce = opts.nonce ?? (await auth.issueNonce());
  const method = opts.method ?? 'GET';
  const body = Buffer.from(opts.body ?? '');
  const signature = sign(null, machineMessage(nonce, method, opts.path ?? PATH, body), signer.privateKey);
  return {
    method,
    originalUrl: '/contests/current',
    headers: {
      'x-original-uri': opts.sentPath ?? opts.path ?? PATH,
      'x-vnoi-machine': signer.fingerprint,
      'x-vnoi-nonce': nonce,
      'x-vnoi-signature': signature.toString('base64'),
    },
    rawBody: Buffer.from(opts.sentBody ?? opts.body ?? ''),
    user: opts.user,
  } as Record<string, any>;
}

const unsigned = (user?: unknown) => ({ method: 'GET', originalUrl: PATH, headers: {}, user }) as Record<string, any>;
const ctx = (req: unknown) => ({ switchToHttp: () => ({ getRequest: () => req }) }) as any;

describe('MachineGuard', () => {
  afterEach(() => jest.useRealTimers());

  it('accepts a request signed by an approved machine and marks it', async () => {
    const { auth, guard } = setup();
    const req = await signedRequest(auth);
    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
    expect(req.machine).toBe(known.fingerprint);
  });

  it('refuses a key it has never enrolled', async () => {
    const { auth, guard } = setup();
    await expect(guard.canActivate(ctx(await signedRequest(auth, { signer: stranger })))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('refuses a key that claims an enrolled machine id', async () => {
    const { auth, guard } = setup();
    const req = await signedRequest(auth, { signer: { ...stranger, fingerprint: known.fingerprint } });
    await expect(guard.canActivate(ctx(req))).rejects.toThrow('machine not approved');
  });

  it.each([MachineStatus.PENDING, MachineStatus.REVOKED])('refuses a %s machine', async (status) => {
    const { auth, guard } = setup({ status });
    await expect(guard.canActivate(ctx(await signedRequest(auth)))).rejects.toThrow('machine not approved');
  });

  it('refuses a replayed nonce', async () => {
    const { auth, guard } = setup();
    const req = await signedRequest(auth);
    await guard.canActivate(ctx({ ...req }));
    await expect(guard.canActivate(ctx({ ...req }))).rejects.toThrow('machine not approved');
  });

  it('refuses a nonce central never issued', async () => {
    const { auth, guard } = setup();
    await expect(guard.canActivate(ctx(await signedRequest(auth, { nonce: 'made-up' })))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('refuses an expired nonce', async () => {
    jest.useFakeTimers();
    const { auth, guard } = setup();
    const req = await signedRequest(auth);
    jest.advanceTimersByTime(61_000);
    await expect(guard.canActivate(ctx(req))).rejects.toThrow(ForbiddenException);
  });

  it('refuses a signature moved to another path', async () => {
    const { auth, guard } = setup();
    const req = await signedRequest(auth, { sentPath: '/internal/remote-control/scripts/x' });
    await expect(guard.canActivate(ctx(req))).rejects.toThrow(ForbiddenException);
  });

  it('refuses a tampered body', async () => {
    const { auth, guard } = setup();
    const req = await signedRequest(auth, { method: 'POST', body: 'a', sentBody: 'b' });
    await expect(guard.canActivate(ctx(req))).rejects.toThrow(ForbiddenException);
  });

  it('signs multipart bodies too, and multer still reads them afterwards', async () => {
    const { auth, guard } = setup();
    const body = '--b\r\nContent-Disposition: form-data; name="file"; filename="a.txt"\r\n\r\nhi\r\n--b--\r\n';
    const signed = await signedRequest(auth, { method: 'POST', body });
    const req = Object.assign(Readable.from([Buffer.from(body)]), signed, { rawBody: undefined });
    req.headers['content-type'] = 'multipart/form-data; boundary=b';
    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);

    const seen: Buffer[] = [];
    const sink = new Writable({
      write: (chunk, _, done) => {
        seen.push(chunk);
        done();
      },
    });
    await new Promise((resolve) => req.pipe(sink).on('finish', resolve));
    expect(Buffer.concat(seen).toString()).toBe(body);
  });

  describe('with enforcement off', () => {
    it('lets unsigned requests through', async () => {
      const { guard } = setup({ required: false });
      const req = unsigned('alice');
      await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
      expect(req.machine).toBeUndefined();
    });

    it('still verifies a signature that is present', async () => {
      const { auth, guard } = setup({ required: false });
      const req = await signedRequest(auth);
      await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
      expect(req.machine).toBe(known.fingerprint);
    });

    it('lets a bad signature through unmarked, like an unsigned request', async () => {
      const { auth, guard } = setup({ required: false, status: MachineStatus.PENDING });
      const req = await signedRequest(auth);
      await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
      expect(req.machine).toBeUndefined();
    });
  });

  describe('with enforcement on, unsigned', () => {
    it.each([
      ['a contestant found by VPN IP', 'alice'],
      ['a contestant token', { sub: 'alice' }],
      ['a guest', 'guest_001'],
      ['an anonymous machine call', undefined],
      ['an unknown user', 'ghost'],
    ])('refuses %s', async (_, user) => {
      const { guard } = setup();
      await expect(guard.canActivate(ctx(unsigned(user)))).rejects.toThrow('machine not approved');
    });

    it.each([
      ['an admin token', { sub: 'root' }],
      ['a coach token', { sub: 'coach' }],
    ])('lets %s through', async (_, user) => {
      const { guard } = setup();
      await expect(guard.canActivate(ctx(unsigned(user)))).resolves.toBe(true);
    });
  });
});

describe('ApprovedMachineGuard', () => {
  const strict = (opts: Parameters<typeof setup>[0]) => {
    const { auth } = setup(opts);
    return { auth, guard: new ApprovedMachineGuard(auth) };
  };

  it.each([true, false])('accepts an approved machine and marks it (enforcement %p)', async (required) => {
    const { auth, guard } = strict({ required });
    const req = await signedRequest(auth);
    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
    expect(req.machine).toBe(known.fingerprint);
  });

  describe('with enforcement off', () => {
    it.each([
      ['an unsigned request', undefined],
      ['an unsigned admin token', { sub: 'root' }],
    ])('refuses %s', async (_, user) => {
      const { guard } = strict({ required: false });
      await expect(guard.canActivate(ctx(unsigned(user)))).rejects.toThrow(ForbiddenException);
    });

    it.each([MachineStatus.PENDING, MachineStatus.REVOKED])('refuses a %s machine', async (status) => {
      const { auth, guard } = strict({ required: false, status });
      await expect(guard.canActivate(ctx(await signedRequest(auth)))).rejects.toThrow(ForbiddenException);
    });

    it('refuses a key it has never enrolled', async () => {
      const { auth, guard } = strict({ required: false });
      await expect(guard.canActivate(ctx(await signedRequest(auth, { signer: stranger })))).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
