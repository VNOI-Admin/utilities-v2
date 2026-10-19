import { generateKeyPairSync } from 'crypto';
import { MachineStatus } from '@libs/common-db/schemas/machine.schema';
import { Role } from '@libs/common/decorators/role.decorator';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import { machineCode, machineFingerprint } from '@libs/common/machine/machine-auth';
import { ConflictException, HttpStatus, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import { MachinesController } from './machines.controller';
import { MachinesService } from './machines.service';

type Doc = Record<string, any>;

const matches = (doc: Doc, query: Doc) =>
  Object.entries(query).every(([k, v]) => {
    if (v && typeof v === 'object' && '$ne' in v) return doc[k] !== v.$ne;
    if (v && typeof v === 'object' && '$gte' in v) return doc[k] >= v.$gte;
    return doc[k] === v;
  });

function fakeMachineModel(docs: Doc[] = []) {
  return {
    docs,
    findOne: (q: Doc) => ({ lean: async () => docs.find((d) => matches(d, q)) ?? null }),
    find: (q: Doc) => ({ limit: (n: number) => ({ lean: async () => docs.filter((d) => matches(d, q)).slice(0, n) }) }),
    countDocuments: async (q: Doc) => docs.filter((d) => matches(d, q)).length,
    findOneAndUpdate: (q: Doc, update: Doc, options: Doc = {}) => ({
      lean: async () => {
        let doc = docs.find((d) => matches(d, q));
        if (!doc && options.upsert) {
          doc = { status: MachineStatus.PENDING, createdAt: new Date(), ...update.$setOnInsert } as Doc;
          docs.push(doc);
        }
        if (doc) Object.assign(doc, update.$set);
        return doc ?? null;
      },
    }),
  };
}

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
    const out = await new MachinesService(model as any, {} as any).enroll(
      { publicKey: key.b64, hostname: 'pc-01', code: 'AAAAA-AAAAA' } as any,
      '1.2.3.4',
    );
    expect(out).toEqual({ code: machineCode(key.raw), status: MachineStatus.PENDING });
    expect(model.docs).toHaveLength(1);
    expect(model.docs[0]).toMatchObject({ fingerprint: machineFingerprint(key.raw), code: machineCode(key.raw) });
  });

  it('is idempotent per key and never changes the status of a known machine', async () => {
    const model = fakeMachineModel();
    const service = new MachinesService(model as any, {} as any);
    const key = publicKey();
    await service.enroll({ publicKey: key.b64, hostname: 'pc-01' }, '1.2.3.4');
    model.docs[0].status = MachineStatus.REVOKED;
    const again = await service.enroll({ publicKey: key.b64, hostname: 'other' }, '1.2.3.4');
    expect(again.status).toBe(MachineStatus.REVOKED);
    expect(model.docs).toHaveLength(1);
    expect(model.docs[0].hostname).toBe('pc-01');
  });

  it('rate-limits new enrollments per source address', async () => {
    const recent = Array.from({ length: 300 }, () => ({ enrollIp: '1.2.3.4', createdAt: new Date() }));
    const service = new MachinesService(fakeMachineModel(recent) as any, {} as any);
    await expect(service.enroll({ publicKey: publicKey().b64, hostname: 'x' }, '1.2.3.4')).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
    await expect(service.enroll({ publicKey: publicKey().b64, hostname: 'x' }, '5.6.7.8')).resolves.toBeDefined();
  });
});

describe('MachinesService.approve', () => {
  it('approves the one machine waiting with the code, however the admin typed it', async () => {
    const target = machine('CSM7N-BFRCA');
    const model = fakeMachineModel([target, machine('CC6WT-AB6RG')]);
    const out = await new MachinesService(model as any, {} as any).approve('csm7n bfrca', 'e2e-admin');
    expect(out).toMatchObject({ code: 'CSM7N-BFRCA', status: MachineStatus.APPROVED, approvedBy: 'e2e-admin' });
    expect(model.docs[1].status).toBe(MachineStatus.PENDING);
  });

  it('re-approves a revoked machine by its code', async () => {
    const model = fakeMachineModel([machine('CSM7N-BFRCA', MachineStatus.REVOKED)]);
    await expect(new MachinesService(model as any, {} as any).approve('CSM7N-BFRCA', 'a')).resolves.toMatchObject({
      status: MachineStatus.APPROVED,
    });
  });

  it('answers 404 when no machine waits with the code', async () => {
    const model = fakeMachineModel([machine('CSM7N-BFRCA', MachineStatus.APPROVED)]);
    await expect(new MachinesService(model as any, {} as any).approve('CSM7N-BFRCA', 'a')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('answers 409 and approves nothing when several machines wait with the code', async () => {
    const model = fakeMachineModel([machine('CSM7N-BFRCA'), machine('CSM7N-BFRCA')]);
    await expect(new MachinesService(model as any, {} as any).approve('CSM7N-BFRCA', 'a')).rejects.toThrow(
      ConflictException,
    );
    expect(model.docs.map((d) => d.status)).toEqual([MachineStatus.PENDING, MachineStatus.PENDING]);
  });
});

describe('MachinesService.revoke', () => {
  it('revokes by fingerprint', async () => {
    const target = machine('CSM7N-BFRCA', MachineStatus.APPROVED);
    const model = fakeMachineModel([target]);
    await new MachinesService(model as any, {} as any).revoke(target.fingerprint);
    expect(model.docs[0].status).toBe(MachineStatus.REVOKED);
  });
});

describe('MachinesController admin routes', () => {
  const adminOnly = ['list', 'approve', 'revoke', 'remove'] as const;

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
