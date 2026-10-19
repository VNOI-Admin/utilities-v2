import { ForbiddenException } from '@nestjs/common';

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

describe('VpnService.getWireGuardGuestConfig', () => {
  const guest = { username: 'guest_001', vpnIpAddress: '10.200.0.1', keyPair: { privateKey: 'priv', publicKey: 'pub' } };

  const setup = (token: string | undefined) => {
    const userModel = { findOneAndUpdate: jest.fn().mockResolvedValue(guest) };
    const config = { get: (key: string) => (key === 'GUEST_VPN_TOKEN' ? token : 'x') };
    return { userModel, service: new VpnService(userModel as any, config as any) };
  };

  it('refuses a request without the provisioning token and claims nothing', async () => {
    const { userModel, service } = setup('secret');
    await expect(service.getWireGuardGuestConfig(undefined)).rejects.toThrow(ForbiddenException);
    await expect(service.getWireGuardGuestConfig('wrong')).rejects.toThrow(ForbiddenException);
    expect(userModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('stays closed when no token is configured', async () => {
    const { service } = setup(undefined);
    await expect(service.getWireGuardGuestConfig('')).rejects.toThrow(ForbiddenException);
  });

  it('hands out a guest config for the right token', async () => {
    const { service } = setup('secret');
    const { config, apiKey } = await service.getWireGuardGuestConfig('secret');
    expect(config).toContain('PrivateKey = priv');
    expect(apiKey).toBeNull();
  });
});
