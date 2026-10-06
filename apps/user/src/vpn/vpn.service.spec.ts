import { ForbiddenException } from '@nestjs/common';

import { VpnService } from './vpn.service';

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
    const { config } = await service.getWireGuardGuestConfig('secret');
    expect(config).toContain('PrivateKey = priv');
  });
});
