import { createServer } from 'net';
import { probeTcpPort } from './tcp-probe';

// The outcome mapping is the whole check: a reset read as "filtered" would clear a
// tampered machine, so exercise it against a real socket rather than a mock.
describe('probeTcpPort', () => {
  it('reports a listening port as open', async () => {
    const server = createServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as { port: number };

    await expect(probeTcpPort('127.0.0.1', port, 1000)).resolves.toEqual({ port, outcome: 'open' });

    await new Promise((resolve) => server.close(resolve));
  });

  it('reports a reset as refused rather than silence', async () => {
    const server = createServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as { port: number };
    await new Promise((resolve) => server.close(resolve));

    const result = await probeTcpPort('127.0.0.1', port, 1000);

    expect(result.outcome).toBe('refused');
    expect(result.detail).toBe('ECONNREFUSED');
  });
});
