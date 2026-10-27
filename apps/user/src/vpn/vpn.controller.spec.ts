import { generateKeyPairSync, sign } from 'crypto';
import { MachineStatus } from '@libs/common-db/schemas/machine.schema';
import { ApprovedMachineGuard, MachineGuard } from '@libs/common/guards/machine.guard';
import { machineFingerprint, machineMessage } from '@libs/common/machine/machine-auth';
import { MachineAuthService } from '@libs/common/machine/machine-auth.service';
import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';

import { VpnController } from './vpn.controller';
import { VpnService } from './vpn.service';

describe('VpnController', () => {
  it.each(['getWireGuardConfig', 'getWireGuardConfigByUsername'] as const)(
    '%s ends its guard chain with MachineGuard',
    (handler) => {
      expect(Reflect.getMetadata(GUARDS_METADATA, VpnController.prototype[handler]).at(-1)).toBe(MachineGuard);
    },
  );

  it('guards the guest config with ApprovedMachineGuard alone', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, VpnController.prototype.getWireGuardGuestConfig)).toEqual([
      ApprovedMachineGuard,
    ]);
  });
});

describe('GET /vpn/guest with MACHINE_AUTH_REQUIRED off', () => {
  const PATH = '/user/vpn/guest';
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const raw = Buffer.from(publicKey.export({ format: 'jwk' }).x as string, 'base64url');
  const fingerprint = machineFingerprint(raw);

  function setup(status: MachineStatus) {
    const machines = [{ fingerprint, publicKey: raw.toString('base64'), status }];
    const nonces = new Set<string>();
    const machineModel = {
      findOne: (q: { fingerprint: string }) => ({
        lean: async () => machines.find((m) => m.fingerprint === q.fingerprint) ?? null,
      }),
    };
    const nonceModel = {
      create: async ({ nonce }: { nonce: string }) => nonces.add(nonce),
      findOneAndDelete: ({ nonce }: { nonce: string }) => ({
        lean: async () => (nonces.delete(nonce) ? { nonce } : null),
      }),
    };
    const config = { get: (k: string) => (k === 'MACHINE_AUTH_REQUIRED' ? 'false' : 'x') };
    const auth = new MachineAuthService(machineModel as any, nonceModel as any, config as any);
    const guest = {
      username: 'guest_001',
      role: 'guest',
      isActive: false,
      vpnIpAddress: '10.200.0.1',
      keyPair: { privateKey: 'priv', publicKey: 'pub' },
    };
    const userModel = { findOneAndUpdate: jest.fn(async () => guest) };
    const controller = new VpnController(new VpnService(userModel as any, config as any));
    const guard = new ApprovedMachineGuard(auth);

    const call = async (req: Record<string, any>) => {
      await guard.canActivate({ switchToHttp: () => ({ getRequest: () => req }) } as any);
      return controller.getWireGuardGuestConfig(req);
    };
    const signed = async () => {
      const nonce = await auth.issueNonce();
      const signature = sign(null, machineMessage(nonce, 'GET', PATH, Buffer.alloc(0)), privateKey);
      return {
        method: 'GET',
        originalUrl: '/vpn/guest',
        headers: {
          'x-original-uri': PATH,
          'x-vnoi-machine': fingerprint,
          'x-vnoi-nonce': nonce,
          'x-vnoi-signature': signature.toString('base64'),
        },
      };
    };
    return { call, signed, userModel };
  }

  it('refuses an unsigned caller and hands out nothing', async () => {
    const { call, userModel } = setup(MachineStatus.APPROVED);
    await expect(call({ method: 'GET', originalUrl: '/vpn/guest', headers: {} })).rejects.toThrow(ForbiddenException);
    expect(userModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it.each([MachineStatus.PENDING, MachineStatus.REVOKED])('refuses a %s machine', async (status) => {
    const { call, signed, userModel } = setup(status);
    await expect(call(await signed())).rejects.toThrow(ForbiddenException);
    expect(userModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('serves an approved machine the account bound to its fingerprint', async () => {
    const { call, signed, userModel } = setup(MachineStatus.APPROVED);
    const out = await call(await signed());
    expect(out.config).toContain('PrivateKey = priv');
    expect(userModel.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ machine: fingerprint }),
      expect.anything(),
      expect.anything(),
    );
  });
});
