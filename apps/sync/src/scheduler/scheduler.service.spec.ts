import { SchedulerService } from './scheduler.service';

function makeHarness(config: Record<string, string | undefined>) {
  const queues = {
    pingUsers: { add: jest.fn() },
    syncSubmissions: { add: jest.fn() },
    processReactions: { add: jest.fn() },
    securityReport: { add: jest.fn() },
    firewallProbe: { add: jest.fn() },
  };
  const configService = { get: (key: string) => config[key] };
  const service = new SchedulerService(
    queues.pingUsers as any,
    queues.syncSubmissions as any,
    queues.processReactions as any,
    queues.securityReport as any,
    queues.firewallProbe as any,
    configService as any,
  );
  return { queues, service };
}

describe('SchedulerService security report schedule', () => {
  it('registers the repeatable security report job when SECURITY_REPORT_CRON is set', async () => {
    const { queues, service } = makeHarness({ SECURITY_REPORT_CRON: '30 4 * * *' });

    await service.onModuleInit();

    expect(queues.securityReport.add).toHaveBeenCalledWith(
      'run-security-report',
      {},
      {
        repeat: { pattern: '30 4 * * *' },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  });

  it('stays opt-in when SECURITY_REPORT_CRON is unset', async () => {
    const { queues, service } = makeHarness({});

    await service.onModuleInit();

    expect(queues.securityReport.add).not.toHaveBeenCalled();
    expect(queues.pingUsers.add).toHaveBeenCalled();
  });
});

describe('SchedulerService firewall probe schedule', () => {
  it('registers the repeatable firewall probe job when FIREWALL_PROBE_CRON is set', async () => {
    const { queues, service } = makeHarness({ FIREWALL_PROBE_CRON: '*/10 * * * *' });

    await service.onModuleInit();

    expect(queues.firewallProbe.add).toHaveBeenCalledWith(
      'run-firewall-probe',
      {},
      {
        repeat: { pattern: '*/10 * * * *' },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );
  });

  it('stays opt-in when FIREWALL_PROBE_CRON is unset', async () => {
    const { queues, service } = makeHarness({});

    await service.onModuleInit();

    expect(queues.firewallProbe.add).not.toHaveBeenCalled();
  });
});
