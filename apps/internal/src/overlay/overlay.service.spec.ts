import { ForbiddenException } from '@nestjs/common';

import { OverlayService } from './overlay.service';

describe('OverlayService.assertStreamTarget', () => {
  const users = [
    { vpnIpAddress: '10.10.0.5', role: 'contestant' },
    { vpnIpAddress: '10.100.0.2', role: 'admin' },
  ];
  const userModel = {
    exists: async (q: { vpnIpAddress: string; role: string }) =>
      users.some((u) => u.vpnIpAddress === q.vpnIpAddress && u.role === q.role) ? { _id: 1 } : null,
  };
  const service = new OverlayService(userModel as any, {} as any, {} as any, {} as any, { get: () => '' } as any);

  it('allows a contestant machine', async () => {
    await expect(service.assertStreamTarget('/stream-source/10.10.0.5/stream.m3u8')).resolves.toBeUndefined();
  });

  it.each([
    '/stream-source/10.100.0.2/stream.m3u8',
    '/stream-source/10.10.0.6/stream.m3u8',
    '/stream-source/10.10.0.5',
    '/other/10.10.0.5/stream.m3u8',
    '',
  ])('refuses %p', async (uri) => {
    await expect(service.assertStreamTarget(uri)).rejects.toThrow(ForbiddenException);
  });
});
