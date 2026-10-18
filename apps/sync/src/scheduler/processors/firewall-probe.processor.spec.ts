import { FirewallProbeProcessor } from './firewall-probe.processor';

describe('FirewallProbeProcessor', () => {
  it('probes the whole fleet as the scheduler', async () => {
    const firewallProbeService = {
      runProbe: jest.fn().mockResolvedValue({ runId: 'r1', results: [{ status: 'pass' }] }),
    };
    const processor = new FirewallProbeProcessor(firewallProbeService as any);

    await processor.process({ id: 'q1', name: 'run-firewall-probe' } as any);

    expect(firewallProbeService.runProbe).toHaveBeenCalledWith('system:scheduler');
  });

  it('logs failures at error level and unreachable machines quietly', async () => {
    const firewallProbeService = {
      runProbe: jest.fn().mockResolvedValue({
        runId: 'r2',
        results: [{ status: 'fail' }, { status: 'unreachable' }, { status: 'pass' }],
      }),
    };
    const processor = new FirewallProbeProcessor(firewallProbeService as any);
    const error = jest.spyOn((processor as any).logger, 'error').mockImplementation(() => {});

    await processor.process({ id: 'q2', name: 'run-firewall-probe' } as any);

    expect(error).toHaveBeenCalledWith(expect.stringContaining('1 machine(s) failed'));
  });

  it('stays quiet when every machine is merely unreachable', async () => {
    const firewallProbeService = {
      runProbe: jest.fn().mockResolvedValue({ runId: 'r3', results: [{ status: 'unreachable' }] }),
    };
    const processor = new FirewallProbeProcessor(firewallProbeService as any);
    const error = jest.spyOn((processor as any).logger, 'error').mockImplementation(() => {});

    await processor.process({ id: 'q3', name: 'run-firewall-probe' } as any);

    expect(error).not.toHaveBeenCalled();
  });

  it('survives an empty fleet', async () => {
    const firewallProbeService = { runProbe: jest.fn().mockResolvedValue(null) };
    const processor = new FirewallProbeProcessor(firewallProbeService as any);

    await expect(processor.process({ id: 'q4', name: 'run-firewall-probe' } as any)).resolves.toBeUndefined();
  });
});
