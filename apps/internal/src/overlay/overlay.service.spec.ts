import { OverlayService } from './overlay.service';

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
