import { generateKeyPairSync } from 'crypto';
import { MachineStatus } from '@libs/common-db/schemas/machine.schema';
import { Role } from '@libs/common/decorators/role.decorator';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import { machineCode, machineFingerprint } from '@libs/common/machine/machine-auth';
import { machineName } from '@libs/common/machine/machine-name';
import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import { MachinesController } from './machines.controller';
import { MachinesService } from './machines.service';

type Doc = Record<string, any>;

const matches = (doc: Doc, query: Doc) =>
  Object.entries(query).every(([k, v]) => {
    if (v instanceof RegExp) return typeof doc[k] === 'string' && v.test(doc[k]);
    if (v && typeof v === 'object' && '$ne' in v) return doc[k] !== v.$ne;
    if (v && typeof v === 'object' && '$gte' in v) return doc[k] >= v.$gte;
    if (v && typeof v === 'object' && '$in' in v) return v.$in.includes(doc[k]);
    return doc[k] === v;
  });

function query(rows: () => Doc[]) {
  let result = rows;
  const q = {
    sort: () => q,
    select: () => q,
    limit: (n: number) => {
      const all = result;
      result = () => all().slice(0, n);
      return q;
    },
    lean: async () => result(),
  };
  return q;
}

const duplicateKey = () => Object.assign(new Error('E11000 duplicate key error'), { code: 11000 });

function fakeMachineModel(docs: Doc[] = [], hooks: { beforeUpdate?: () => void } = {}) {
  return {
    docs,
    findOne: (q: Doc) => ({ lean: async () => docs.find((d) => matches(d, q)) ?? null }),
    find: (q: Doc = {}) => query(() => docs.filter((d) => matches(d, q))),
    countDocuments: async (q: Doc) => docs.filter((d) => matches(d, q)).length,
    findOneAndUpdate: (q: Doc, update: Doc, options: Doc = {}) => ({
      lean: async () => {
        hooks.beforeUpdate?.();
        let doc = docs.find((d) => matches(d, q));
        if (!doc && options.upsert) {
          doc = { status: MachineStatus.PENDING, createdAt: new Date(), ...update.$setOnInsert } as Doc;
          docs.push(doc);
        }
        const name = update.$set?.name;
        if (doc && name !== undefined && docs.some((d) => d !== doc && d.name === name)) throw duplicateKey();
        if (doc) Object.assign(doc, update.$set);
        return doc ?? null;
      },
    }),
  };
}

const fakeConfigModel = (value?: unknown) => ({
  findOne: (q: Doc) => ({
    lean: async () => (q.key === 'contestantLoginLockedUntil' && value !== undefined ? { key: q.key, value } : null),
  }),
});

const fakeUserModel = (docs: Doc[] = []) => ({ find: (q: Doc) => query(() => docs.filter((d) => matches(d, q))) });

const service = (
  model: ReturnType<typeof fakeMachineModel>,
  {
    auth = {},
    config = fakeConfigModel(),
    users = fakeUserModel(),
  }: { auth?: Doc; config?: Doc; users?: Doc } = {},
) => new MachinesService(model as any, auth as any, config as any, users as any);

function publicKey() {
  const { publicKey: key } = generateKeyPairSync('ed25519');
  const raw = Buffer.from(key.export({ format: 'jwk' }).x as string, 'base64url');
  return { raw, b64: raw.toString('base64') };
}

const machine = (code: string, status = MachineStatus.PENDING) => ({
  fingerprint: `fp-${code}-${Math.random()}`,
  code,
  status,
});

describe('MachinesService.enroll', () => {
  it('stores a pending machine under the code central derives itself, ignoring any code the client sends', async () => {
    const model = fakeMachineModel();
    const key = publicKey();
    const out = await service(model).enroll(
      { publicKey: key.b64, hostname: 'pc-01', code: 'AAAAA-AAAAA' } as any,
      '1.2.3.4',
    );
    expect(out).toEqual({ code: machineCode(key.raw), status: MachineStatus.PENDING });
    expect(model.docs).toHaveLength(1);
    expect(model.docs[0]).toMatchObject({ fingerprint: machineFingerprint(key.raw), code: machineCode(key.raw) });
  });

  it('is idempotent per key and never changes the status of a known machine', async () => {
    const model = fakeMachineModel();
    const machines = service(model);
    const key = publicKey();
    await machines.enroll({ publicKey: key.b64, hostname: 'pc-01' }, '1.2.3.4');
    model.docs[0].status = MachineStatus.REVOKED;
    const again = await machines.enroll({ publicKey: key.b64, hostname: 'other' }, '1.2.3.4');
    expect(again.status).toBe(MachineStatus.REVOKED);
    expect(model.docs).toHaveLength(1);
    expect(model.docs[0].hostname).toBe('pc-01');
  });

  it('rate-limits new enrollments per source address', async () => {
    const recent = Array.from({ length: 300 }, () => ({ enrollIp: '1.2.3.4', createdAt: new Date() }));
    const machines = service(fakeMachineModel(recent));
    await expect(machines.enroll({ publicKey: publicKey().b64, hostname: 'x' }, '1.2.3.4')).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
    await expect(machines.enroll({ publicKey: publicKey().b64, hostname: 'x' }, '5.6.7.8')).resolves.toBeDefined();
  });
});

describe('MachinesService.approve', () => {
  it('approves the one machine waiting with the code, however the admin typed it', async () => {
    const target = machine('CSM7N-BFRCA');
    const model = fakeMachineModel([target, machine('CC6WT-AB6RG')]);
    const out = await service(model).approve('csm7n bfrca', 'e2e-admin');
    expect(out).toMatchObject({ code: 'CSM7N-BFRCA', status: MachineStatus.APPROVED, approvedBy: 'e2e-admin' });
    expect(model.docs[1].status).toBe(MachineStatus.PENDING);
  });

  it('re-approves a revoked machine by its code', async () => {
    const model = fakeMachineModel([machine('CSM7N-BFRCA', MachineStatus.REVOKED)]);
    await expect(service(model).approve('CSM7N-BFRCA', 'a')).resolves.toMatchObject({
      status: MachineStatus.APPROVED,
    });
  });

  it('answers 404 when no machine waits with the code', async () => {
    const model = fakeMachineModel([machine('CSM7N-BFRCA', MachineStatus.APPROVED)]);
    await expect(service(model).approve('CSM7N-BFRCA', 'a')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('answers 409 and approves nothing when several machines wait with the code', async () => {
    const model = fakeMachineModel([machine('CSM7N-BFRCA'), machine('CSM7N-BFRCA')]);
    await expect(service(model).approve('CSM7N-BFRCA', 'a')).rejects.toThrow(
      ConflictException,
    );
    expect(model.docs.map((d) => d.status)).toEqual([MachineStatus.PENDING, MachineStatus.PENDING]);
  });
});

describe('MachinesService.approveFingerprint', () => {
  it.each([MachineStatus.PENDING, MachineStatus.REVOKED])('approves a %s machine by its fingerprint', async (from) => {
    const target = machine('CSM7N-BFRCA', from);
    const model = fakeMachineModel([machine('CSM7N-BFRCA'), target]);
    const out = await service(model).approveFingerprint(target.fingerprint, 'phone-admin');
    expect(out).toMatchObject({ fingerprint: target.fingerprint, status: MachineStatus.APPROVED, approvedBy: 'phone-admin' });
    expect(model.docs[0].status).toBe(MachineStatus.PENDING);
  });

  it('answers 404 for a fingerprint it does not know', async () => {
    const model = fakeMachineModel([machine('CSM7N-BFRCA')]);
    await expect(service(model).approveFingerprint('nope', 'a')).rejects.toThrow(NotFoundException);
  });

  it('leaves an approved machine as it was', async () => {
    const approvedAt = new Date('2026-01-01T00:00:00Z');
    const target = { ...machine('CSM7N-BFRCA', MachineStatus.APPROVED), name: 'calm-heron', approvedBy: 'x', approvedAt };
    const model = fakeMachineModel([target]);
    await expect(service(model).approveFingerprint(target.fingerprint, 'y')).resolves.toMatchObject({
      status: MachineStatus.APPROVED,
      name: 'calm-heron',
      approvedBy: 'x',
      approvedAt,
    });
  });
});

describe('machine names at approval', () => {
  const fp = (prefix: string) => prefix.padEnd(64, '0');
  const pending = (fingerprint: string, code = 'CSM7N-BFRCA') => ({ fingerprint, code, status: MachineStatus.PENDING });

  it('names a machine from its fingerprint on either approve route', async () => {
    const byCode = pending(fp('01'), 'CSM7N-BFRCA');
    const byFingerprint = pending(fp('02'), 'CC6WT-AB6RG');
    const model = fakeMachineModel([byCode, byFingerprint]);
    await service(model).approve('CSM7N-BFRCA', 'a');
    await service(model).approveFingerprint(byFingerprint.fingerprint, 'a');
    expect(model.docs.map((d) => d.name)).toEqual([machineName(fp('01')), machineName(fp('02'))]);
  });

  it('appends -2, -3... when the name is taken', async () => {
    const base = machineName(fp('01'));
    const model = fakeMachineModel([
      { ...pending(fp('41')), status: MachineStatus.APPROVED, name: base },
      { ...pending(fp('81')), status: MachineStatus.APPROVED, name: `${base}-2` },
      pending(fp('c1')),
    ]);
    await expect(service(model).approveFingerprint(fp('c1'), 'a')).resolves.toMatchObject({ name: `${base}-3` });
  });

  it('picks the next name when another approval takes it first', async () => {
    const base = machineName(fp('01'));
    const docs: Doc[] = [pending(fp('01'))];
    let raced = false;
    const model = fakeMachineModel(docs, {
      beforeUpdate: () => {
        if (raced) return;
        raced = true;
        docs.push({ fingerprint: 'racer', status: MachineStatus.APPROVED, name: base });
      },
    });
    await expect(service(model).approveFingerprint(fp('01'), 'a')).resolves.toMatchObject({
      status: MachineStatus.APPROVED,
      name: `${base}-2`,
    });
  });

  it('keeps the name it already has when re-approved after a revoke', async () => {
    const model = fakeMachineModel([{ ...pending(fp('01')), status: MachineStatus.REVOKED, name: 'room-a-01' }]);
    await expect(service(model).approveFingerprint(fp('01'), 'a')).resolves.toMatchObject({ name: 'room-a-01' });
  });
});

describe('MachinesService.me', () => {
  const signed = (doc: Doc) => ({ authenticate: async () => doc });

  it('returns code, status, name and an upcoming contestant login lock', async () => {
    const doc = { ...machine('CSM7N-BFRCA', MachineStatus.APPROVED), name: 'swift-otter' };
    const until = new Date(Date.now() + 3_600_000).toISOString();
    const out = await service(fakeMachineModel([doc]), { auth: signed(doc), config: fakeConfigModel(until) }).me({});
    expect(out).toEqual({ code: 'CSM7N-BFRCA', status: MachineStatus.APPROVED, name: 'swift-otter', lockedUntil: until });
  });

  it.each([
    ['unset', undefined],
    ['cleared', null],
    ['in the past', new Date(Date.now() - 60_000).toISOString()],
    ['not a date', 'soon'],
  ])('returns a null lock when it is %s', async (_, value) => {
    const doc = machine('CSM7N-BFRCA');
    const out = await service(fakeMachineModel([doc]), { auth: signed(doc), config: fakeConfigModel(value) }).me({});
    expect(out).toEqual({ code: 'CSM7N-BFRCA', status: MachineStatus.PENDING, name: null, lockedUntil: null });
  });

  it('answers 404 for an unsigned or unknown caller', async () => {
    const auth = { authenticate: async () => null };
    await expect(service(fakeMachineModel(), { auth }).me({})).rejects.toThrow(NotFoundException);
  });
});

describe('MachinesService.rename', () => {
  const named = (fingerprint: string, name: string) => ({ fingerprint, code: 'CSM7N-BFRCA', status: 'approved', name });

  it('trims and stores the new name', async () => {
    const model = fakeMachineModel([named('a', 'swift-otter')]);
    await expect(service(model).rename('a', '  Room A 01  ')).resolves.toMatchObject({ name: 'Room A 01' });
  });

  it.each([
    ['empty', ''],
    ['only spaces', '   '],
    ['longer than 32 characters', 'x'.repeat(33)],
    ['a control character', 'room\u0007a'],
    ['a newline', 'room\na'],
    ['a bidi override', 'room\u202ea'],
    ['not a string', 42],
  ])('refuses a name that is %s', async (_, name) => {
    const model = fakeMachineModel([named('a', 'swift-otter')]);
    await expect(service(model).rename('a', name as any)).rejects.toThrow(BadRequestException);
    expect(model.docs[0].name).toBe('swift-otter');
  });

  it('accepts exactly 32 characters', async () => {
    const model = fakeMachineModel([named('a', 'swift-otter')]);
    await expect(service(model).rename('a', 'x'.repeat(32))).resolves.toMatchObject({ name: 'x'.repeat(32) });
  });

  it('answers 409 when another machine has the name', async () => {
    const model = fakeMachineModel([named('a', 'swift-otter'), named('b', 'calm-heron')]);
    await expect(service(model).rename('a', 'calm-heron')).rejects.toThrow(ConflictException);
    expect(model.docs[0].name).toBe('swift-otter');
  });

  it('answers 404 for an unknown fingerprint', async () => {
    await expect(service(fakeMachineModel()).rename('nope', 'room-a')).rejects.toThrow(NotFoundException);
  });
});

describe('MachinesService.list', () => {
  it('adds the guest account bound to each machine', async () => {
    const model = fakeMachineModel([named('a'), named('b')]);
    const users = fakeUserModel([
      { username: 'guest_007', vpnIpAddress: '10.200.0.7', machine: 'a', machineUsage: { isOnline: true } },
      { username: 'guest_008', vpnIpAddress: '10.200.0.8', machine: 'gone', machineUsage: { isOnline: false } },
    ]);
    const out = await service(model, { users }).list();
    expect(out).toEqual([
      expect.objectContaining({ fingerprint: 'a', guest: { username: 'guest_007', vpnIpAddress: '10.200.0.7', isOnline: true } }),
      expect.objectContaining({ fingerprint: 'b', guest: null }),
    ]);
  });

  function named(fingerprint: string) {
    return { fingerprint, code: 'CSM7N-BFRCA', status: MachineStatus.APPROVED };
  }
});

describe('MachinesService.revoke', () => {
  it('revokes by fingerprint', async () => {
    const target = machine('CSM7N-BFRCA', MachineStatus.APPROVED);
    const model = fakeMachineModel([target]);
    await service(model).revoke(target.fingerprint);
    expect(model.docs[0].status).toBe(MachineStatus.REVOKED);
  });
});

describe('MachinesController admin routes', () => {
  const adminOnly = ['list', 'approve', 'approveFingerprint', 'rename', 'revoke', 'remove'] as const;

  it.each(adminOnly)('%s needs an admin access token', (handler) => {
    const fn = MachinesController.prototype[handler];
    expect(Reflect.getMetadata('roles', fn)).toEqual([Role.ADMIN]);
    expect(Reflect.getMetadata(GUARDS_METADATA, fn)).toContain(AccessTokenGuard);
  });

  it('turns away a coach token at approve', async () => {
    const req: any = { headers: { authorization: 'Bearer coach' } };
    const guard = new AccessTokenGuard(
      { verifyAsync: async () => ({ sub: 'coach' }) } as any,
      { get: () => 'secret' } as any,
      { get: () => [Role.ADMIN], getAllAndOverride: () => false } as any,
      { findOne: () => ({ lean: async () => ({ username: 'coach', role: Role.COACH }) }) } as any,
    );
    const ctx = { switchToHttp: () => ({ getRequest: () => req }), getHandler: () => undefined, getClass: () => undefined };
    await expect(guard.canActivate(ctx as any)).rejects.toThrow(UnauthorizedException);
  });
});
