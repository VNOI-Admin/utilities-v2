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

describe('OverlayService.setMultiUserStream', () => {
  it('builds stream URLs from LIVESTREAM_PROXY_URL', async () => {
    const userModel = { findOne: async () => ({ username: 'alice', vpnIpAddress: '10.10.0.5' }) };
    const layoutModel = { updateOne: jest.fn(), updateMany: jest.fn() };
    const config = { get: (key: string) => (key === 'LIVESTREAM_PROXY_URL' ? 'https://proxy' : undefined) };
    const service = new OverlayService(userModel as any, layoutModel as any, {} as any, {} as any, config as any);

    await service.setMultiUserStream(['alice']);

    const [, update] = layoutModel.updateOne.mock.calls[0];
    expect(update.data.users[0]).toMatchObject({
      streamUrl: 'https://proxy/10.10.0.5/stream.m3u8',
      webcamUrl: 'https://proxy/10.10.0.5/webcam.m3u8',
    });
  });
});
