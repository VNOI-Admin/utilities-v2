import { FirewallProbeService } from './firewall-probe.service';
import type { PortProbe } from './tcp-probe';
import { FirewallProbeStatus, type PortOutcome } from './verdict';

const WG_CONFIG = {
  WG_PORTAL_BASE_URL: 'http://wg-portal.test/api/v1',
  WG_PORTAL_CORE_ADMIN_USER: 'admin',
  WG_PORTAL_CORE_ADMIN_API_TOKEN: 'token',
};

type MachineFixture = { username: string; vpnIpAddress: string; publicKey?: string | null };

function makeUserModel(machines: MachineFixture[]) {
  const find = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(
        machines.map((machine) => ({
          username: machine.username,
          vpnIpAddress: machine.vpnIpAddress,
          keyPair: { publicKey: 'publicKey' in machine ? machine.publicKey : `pub-${machine.username}` },
        })),
      ),
    }),
  });
  return { find } as any;
}

function makeResultModel() {
  return {
    insertMany: jest.fn().mockResolvedValue([]),
    aggregate: jest.fn().mockResolvedValue([]),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      }),
    }),
  } as any;
}

/** Outcomes keyed by port; anything not listed comes back filtered. */
function makeProbe(outcomes: Record<number, PortOutcome> = {}): jest.MockedFunction<PortProbe> {
  return jest.fn(async (_host: string, port: number) => ({ port, outcome: outcomes[port] ?? 'filtered' })) as any;
}

function makeService(options: {
  machines: MachineFixture[];
  probe?: jest.MockedFunction<PortProbe>;
  config?: Record<string, string | undefined>;
  handshake?: unknown;
}) {
  const userModel = makeUserModel(options.machines);
  const resultModel = makeResultModel();
  const probe = options.probe ?? makeProbe();
  const config = { ...WG_CONFIG, ...(options.config ?? {}) };
  const service = new FirewallProbeService(userModel, resultModel, probe, {
    get: (key: string) => config[key],
  } as any);

  const getPeerMetrics = jest.fn().mockResolvedValue(options.handshake ?? { LastHandshake: new Date().toISOString() });
  (service as any).wgPortalApi = config.WG_PORTAL_BASE_URL ? { getPeerMetrics } : null;

  return { service, userModel, resultModel, probe, getPeerMetrics };
}

describe('FirewallProbeService', () => {
  it('resolves the active fleet the same way job dispatch does', async () => {
    const { service, userModel } = makeService({ machines: [{ username: 'm1', vpnIpAddress: '10.1.0.5' }] });

    await service.runProbe('admin:1');

    expect(userModel.find).toHaveBeenCalledWith({
      role: { $in: ['contestant', 'guest'] },
      isActive: true,
      vpnIpAddress: { $ne: null },
      'keyPair.privateKey': { $ne: null },
    });
  });

  it('restricts to explicit targets without the active-fleet filter', async () => {
    const { service, userModel } = makeService({ machines: [{ username: 'm1', vpnIpAddress: '10.1.0.5' }] });

    await service.runProbe('admin:1', ['m1']);

    expect(userModel.find).toHaveBeenCalledWith({
      username: { $in: ['m1'] },
      vpnIpAddress: { $ne: null },
      'keyPair.privateKey': { $ne: null },
    });
  });

  it('starts nothing when no machine is eligible', async () => {
    const { service, resultModel } = makeService({ machines: [] });

    await expect(service.runProbe('system:scheduler')).resolves.toBeNull();
    expect(resultModel.insertMany).not.toHaveBeenCalled();
  });

  it('probes the agent port plus the must-drop ports on the tunnel address', async () => {
    const { service, probe } = makeService({ machines: [{ username: 'm1', vpnIpAddress: '10.1.0.5' }] });

    await service.runProbe('admin:1');

    const probed = probe.mock.calls.map(([host, port]) => [host, port]);
    expect(probed).toEqual(
      expect.arrayContaining([
        ['10.1.0.5', 9010],
        ['10.1.0.5', 23],
        ['10.1.0.5', 111],
        ['10.1.0.5', 445],
        ['10.1.0.5', 631],
      ]),
    );
  });

  it('honours the configured agent port and must-drop port list', async () => {
    const { service, probe } = makeService({
      machines: [{ username: 'm1', vpnIpAddress: '10.1.0.5' }],
      config: { REMOTE_CONTROL_AGENT_PORT: '9100', FIREWALL_PROBE_BLOCKED_PORTS: '23, 8081 ,bogus' },
    });

    await service.runProbe('admin:1');

    expect(probe.mock.calls.map(([, port]) => port).sort((a, b) => a - b)).toEqual([23, 8081, 9100]);
  });

  it('stores one verdict row per machine under a shared run id', async () => {
    const { service, resultModel } = makeService({
      machines: [
        { username: 'm2', vpnIpAddress: '10.1.0.6' },
        { username: 'm1', vpnIpAddress: '10.1.0.5' },
      ],
      probe: makeProbe({ 9010: 'open' }),
    });

    const run = await service.runProbe('admin:1');

    expect(run?.results).toHaveLength(2);
    expect(run?.results.map((result) => result.target)).toEqual(['m1', 'm2']);
    expect(new Set(run?.results.map((result) => result.runId)).size).toBe(1);
    expect(resultModel.insertMany).toHaveBeenCalledWith(run?.results);
    expect(run?.results.every((result) => result.status === FirewallProbeStatus.PASS)).toBe(true);
  });

  it('marks a machine that answers a must-drop port as failed', async () => {
    const { service } = makeService({
      machines: [{ username: 'm1', vpnIpAddress: '10.1.0.5' }],
      probe: makeProbe({ 9010: 'open', 631: 'open' }),
    });

    const run = await service.runProbe('admin:1');

    expect(run?.results[0].status).toBe(FirewallProbeStatus.FAIL);
    expect(run?.results[0].reasons).toContain('blocked-port-open');
  });

  it('records a powered-off machine as unreachable, not failed', async () => {
    const { service } = makeService({ machines: [{ username: 'm1', vpnIpAddress: '10.1.0.5' }] });

    const run = await service.runProbe('admin:1');

    expect(run?.results[0].status).toBe(FirewallProbeStatus.UNREACHABLE);
    expect(run?.results[0].anchor).toEqual({ port: 9010, outcome: 'filtered', detail: null });
  });

  it('fails a live machine whose peer has not handshaken recently', async () => {
    const { service } = makeService({
      machines: [{ username: 'm1', vpnIpAddress: '10.1.0.5' }],
      probe: makeProbe({ 9010: 'open' }),
      handshake: { LastHandshake: new Date(Date.now() - 2 * 3600 * 1000).toISOString() },
    });

    const run = await service.runProbe('admin:1');

    expect(run?.results[0].status).toBe(FirewallProbeStatus.FAIL);
    expect(run?.results[0].reasons).toEqual(['tunnel-handshake-stale']);
    expect(run?.results[0].handshakeAgeSeconds).toBeGreaterThan(7000);
  });

  it('passes a live machine when wg-portal reports no handshake at all', async () => {
    const { service } = makeService({
      machines: [{ username: 'm1', vpnIpAddress: '10.1.0.5' }],
      probe: makeProbe({ 9010: 'open' }),
      handshake: { LastHandshake: null },
    });

    const run = await service.runProbe('admin:1');

    expect(run?.results[0].status).toBe(FirewallProbeStatus.PASS);
    expect(run?.results[0].handshakeAgeSeconds).toBeNull();
  });

  it('does not turn a wg-portal outage into a fleet-wide failure', async () => {
    const { service, getPeerMetrics } = makeService({
      machines: [{ username: 'm1', vpnIpAddress: '10.1.0.5' }],
      probe: makeProbe({ 9010: 'open' }),
    });
    getPeerMetrics.mockRejectedValue(new Error('connect ECONNREFUSED'));

    const run = await service.runProbe('admin:1');

    expect(run?.results[0].status).toBe(FirewallProbeStatus.PASS);
    expect(run?.results[0].handshakeAgeSeconds).toBeNull();
  });

  it('runs the port checks with wg-portal unconfigured', async () => {
    const { service } = makeService({
      machines: [{ username: 'm1', vpnIpAddress: '10.1.0.5' }],
      probe: makeProbe({ 9010: 'open', 445: 'refused' }),
      config: { WG_PORTAL_BASE_URL: undefined },
    });

    const run = await service.runProbe('admin:1');

    expect(run?.results[0].status).toBe(FirewallProbeStatus.FAIL);
    expect(run?.results[0].reasons).toEqual(['blocked-port-refused']);
  });

  it('skips the handshake lookup for a machine with no public key', async () => {
    const { service, getPeerMetrics } = makeService({
      machines: [{ username: 'm1', vpnIpAddress: '10.1.0.5', publicKey: null }],
      probe: makeProbe({ 9010: 'open' }),
    });

    const run = await service.runProbe('admin:1');

    expect(getPeerMetrics).not.toHaveBeenCalled();
    expect(run?.results[0].status).toBe(FirewallProbeStatus.PASS);
  });

  it('returns the latest verdict per machine for the organizer view', async () => {
    const { service, resultModel } = makeService({ machines: [] });

    await service.getLatestResults();

    expect(resultModel.aggregate).toHaveBeenCalledWith([
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$target', latest: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$latest' } },
      { $sort: { target: 1 } },
    ]);
  });

  it('returns a bounded history for one machine', async () => {
    const { service, resultModel } = makeService({ machines: [] });

    await service.getResultsForTarget('m1', 5);

    expect(resultModel.find).toHaveBeenCalledWith({ target: 'm1' });
  });
});
