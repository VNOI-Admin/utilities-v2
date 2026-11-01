import { ServiceUnavailableException } from '@nestjs/common';

import { VpnService } from './vpn.service';

describe('VpnService.getWireGuardConfig', () => {
  const KEY = 'A'.repeat(48);
  const contestant = (apiKey?: string | null) => ({
    username: 'user1',
    role: 'contestant',
    vpnIpAddress: '10.10.0.2',
    apiKey,
    keyPair: { privateKey: 'priv', publicKey: 'pub' },
  });

  const setup = (user?: ReturnType<typeof contestant>) => {
    const userModel = { findOne: jest.fn().mockReturnValue({ lean: () => Promise.resolve(user ?? contestant(KEY)) }) };
    const config = { get: () => 'x' };
    return { userModel, service: new VpnService(userModel as any, config as any) };
  };

  it('returns the user apiKey alongside the WireGuard config', async () => {
    const { service } = setup();
    const out = await service.getWireGuardConfig('user1');
    expect(out.apiKey).toBe(KEY);
    expect(out.config).toContain('PrivateKey = priv');
  });

  it('returns a null apiKey when the user has none, instead of failing the config download', async () => {
    const { service } = setup(contestant(null));
    const out = await service.getWireGuardConfig('user1');
    expect(out.apiKey).toBeNull();
  });

  it('returns a null apiKey when the field is missing entirely (pre-apiKey users)', async () => {
    const legacy = contestant();
    delete (legacy as Record<string, unknown>).apiKey;
    const { service } = setup(legacy);
    const out = await service.getWireGuardConfig('user1');
    expect(out.apiKey).toBeNull();
  });
});

type Doc = Record<string, any>;

const get = (doc: Doc, path: string) => path.split('.').reduce((v, k) => v?.[k], doc);

function setPath(doc: Doc, path: string, value: unknown) {
  const keys = path.split('.');
  const last = keys.pop() as string;
  const parent = keys.reduce((v, k) => (v[k] ??= {}), doc);
  parent[last] = value;
}

const matches = (doc: Doc, query: Doc) =>
  Object.entries(query).every(([path, v]) => {
    const value = get(doc, path);
    if (v && typeof v === 'object' && '$ne' in v) return (value ?? null) !== v.$ne;
    if (v === null) return value === null || value === undefined;
    return value === v;
  });

function fakeUserModel(docs: Doc[], hooks: { beforeUpdate?: () => void } = {}) {
  return {
    docs,
    findOneAndUpdate: async (q: Doc, update: Doc, options: Doc = {}) => {
      hooks.beforeUpdate?.();
      const found = docs.filter((d) => matches(d, q));
      if (options.sort?.username) found.sort((a, b) => a.username.localeCompare(b.username));
      const doc = found[0];
      if (!doc) return null;
      const machine = update.$set?.machine;
      if (machine !== undefined && docs.some((d) => d !== doc && d.machine === machine)) {
        throw Object.assign(new Error('E11000 duplicate key error'), { code: 11000 });
      }
      Object.entries(update.$set ?? {}).forEach(([path, value]) => setPath(doc, path, value));
      return doc;
    },
  };
}

const guest = (n: number, extra: Doc = {}) => ({
  username: `guest_00${n}`,
  role: 'guest',
  isActive: false,
  vpnIpAddress: `10.200.0.${n}`,
  keyPair: { privateKey: `priv${n}`, publicKey: `pub${n}` },
  ...extra,
});

describe('VpnService.getWireGuardGuestConfig', () => {
  const setup = (docs: Doc[], hooks?: { beforeUpdate?: () => void }) => {
    const userModel = fakeUserModel(docs, hooks);
    return { userModel, service: new VpnService(userModel as any, { get: () => 'x' } as any) };
  };
  const owned = (userModel: ReturnType<typeof fakeUserModel>, machine: string) =>
    userModel.docs.filter((d) => d.machine === machine).map((d) => d.username);

  it('binds a free guest account to the machine and hands out its config', async () => {
    const { userModel, service } = setup([guest(2), guest(1)]);
    const { config, apiKey } = await service.getWireGuardGuestConfig('fp-a');
    expect(config).toContain('PrivateKey = priv1');
    expect(apiKey).toBeNull();
    expect(owned(userModel, 'fp-a')).toEqual(['guest_001']);
    expect(userModel.docs[1]).toMatchObject({ isActive: true, machineUsage: { lastReportedAt: expect.any(Date) } });
  });

  it('gives the same machine the same account every time, even after the account went idle', async () => {
    const { userModel, service } = setup([guest(1), guest(2), guest(3)]);
    const first = await service.getWireGuardGuestConfig('fp-a');
    userModel.docs[0].isActive = false;
    userModel.docs[0].machineUsage.lastReportedAt = new Date(0);
    const second = await service.getWireGuardGuestConfig('fp-a');
    expect(second.config).toBe(first.config);
    expect(owned(userModel, 'fp-a')).toEqual(['guest_001']);
    expect(userModel.docs[0].isActive).toBe(true);
    expect(userModel.docs[0].machineUsage.lastReportedAt.getTime()).toBeGreaterThan(0);
  });

  it('gives a second machine a different account', async () => {
    const { userModel, service } = setup([guest(1), guest(2)]);
    const a = await service.getWireGuardGuestConfig('fp-a');
    const b = await service.getWireGuardGuestConfig('fp-b');
    expect(b.config).not.toBe(a.config);
    expect(owned(userModel, 'fp-a')).toEqual(['guest_001']);
    expect(owned(userModel, 'fp-b')).toEqual(['guest_002']);
  });

  it('prefers an account no machine has used over an idle one bound to another machine', async () => {
    const { userModel, service } = setup([guest(1, { machine: 'fp-old' }), guest(2)]);
    await service.getWireGuardGuestConfig('fp-a');
    expect(owned(userModel, 'fp-a')).toEqual(['guest_002']);
    expect(owned(userModel, 'fp-old')).toEqual(['guest_001']);
  });

  it('takes over an idle account bound to another machine when no unbound one is left', async () => {
    const { userModel, service } = setup([
      guest(1, { machine: 'fp-old' }),
      guest(2, { isActive: true, machine: 'fp-b' }),
    ]);
    await service.getWireGuardGuestConfig('fp-a');
    expect(owned(userModel, 'fp-a')).toEqual(['guest_001']);
    expect(owned(userModel, 'fp-old')).toEqual([]);
  });

  it('skips accounts without a VPN address or key pair', async () => {
    const { userModel, service } = setup([
      guest(1, { vpnIpAddress: null }),
      guest(2, { keyPair: { privateKey: null, publicKey: 'pub2' } }),
      guest(3),
    ]);
    await service.getWireGuardGuestConfig('fp-a');
    expect(owned(userModel, 'fp-a')).toEqual(['guest_003']);
  });

  it('answers 503 and binds nothing when every account is in use', async () => {
    const { userModel, service } = setup([guest(1, { isActive: true, machine: 'fp-b' })]);
    await expect(service.getWireGuardGuestConfig('fp-a')).rejects.toThrow(ServiceUnavailableException);
    expect(owned(userModel, 'fp-a')).toEqual([]);
  });

  it('hands back the account a concurrent request from the same machine bound first', async () => {
    const docs = [guest(1), guest(2)];
    let calls = 0;
    const { userModel, service } = setup(docs, {
      beforeUpdate: () => {
        // The bound lookup has missed; the other request binds guest_002 before this claim lands.
        if (++calls === 2) Object.assign(docs[1], { isActive: true, machine: 'fp-a' });
      },
    });
    const out = await service.getWireGuardGuestConfig('fp-a');
    expect(out.config).toContain('PrivateKey = priv2');
    expect(owned(userModel, 'fp-a')).toEqual(['guest_002']);
  });
});
