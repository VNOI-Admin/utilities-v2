import { SecurityReportProcessor } from './security-report.processor';

describe('SecurityReportProcessor', () => {
  it('runs the report for the whole fleet as the scheduler', async () => {
    const securityReportService = { runSecurityReport: jest.fn().mockResolvedValue({ jobId: 'j1', targets: ['m1'] }) };
    const processor = new SecurityReportProcessor(securityReportService as any);

    await processor.process({ id: 'q1', name: 'run-security-report' } as any);

    expect(securityReportService.runSecurityReport).toHaveBeenCalledWith('system:scheduler');
  });

  it('survives an empty fleet', async () => {
    const securityReportService = { runSecurityReport: jest.fn().mockResolvedValue(null) };
    const processor = new SecurityReportProcessor(securityReportService as any);

    await expect(processor.process({ id: 'q2', name: 'run-security-report' } as any)).resolves.toBeUndefined();
  });
});
