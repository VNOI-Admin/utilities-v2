import { RemoteJobEntity } from './remoteJob.entity';

const job = (statusCounts: { pending: number; running: number; success: number; failed: number }) =>
  new RemoteJobEntity({
    jobId: 'job-1',
    scriptName: 'security-report',
    scriptHash: 'hash',
    args: [],
    env: {},
    inputFiles: [],
    createdBy: 'system:scheduler',
    createdAt: new Date(),
    targets: [],
    statusCounts,
  });

describe('RemoteJobEntity status', () => {
  it.each([
    [{ pending: 1, running: 1, success: 0, failed: 1 }, 'pending'],
    [{ pending: 0, running: 1, success: 1, failed: 1 }, 'running'],
    [{ pending: 0, running: 0, success: 2, failed: 0 }, 'success'],
    [{ pending: 0, running: 0, success: 1, failed: 1 }, 'partial'],
    [{ pending: 0, running: 0, success: 0, failed: 2 }, 'failed'],
  ])('%j -> %s', (counts, expected) => expect(job(counts).status).toBe(expected));
});
