import { RemoteJobRunStatus } from '@libs/common-db/schemas/remoteJobRun.schema';

import { RemoteControlService } from './remote-control.service';

function fakeRunModel(initial: Record<string, any>) {
  const state: Record<string, any> = { ...initial, outputFiles: [] };
  const doc = () => ({ ...state, toObject: () => ({ ...state }) });
  return {
    state,
    findOne: () => Object.assign(Promise.resolve(doc()), { lean: async () => ({ ...state }) }),
    findOneAndUpdate: async (filter: Record<string, any>, update: Record<string, any>) => {
      if (filter.status !== undefined && filter.status !== state.status) return null;
      Object.assign(state, update);
      return doc();
    },
  };
}

describe('RemoteControlService.applyAgentUpdate', () => {
  it('keeps a finished run finished when a late running update arrives', async () => {
    const runModel = fakeRunModel({ jobId: 'j1', target: 'alice', status: RemoteJobRunStatus.SUCCESS, exitCode: 0, log: 'done' });
    const jobModel = { updateOne: jest.fn() };
    const config = { get: () => undefined };
    const service = new RemoteControlService({} as any, jobModel as any, runModel as any, {} as any, {} as any, config as any);

    await service.applyAgentUpdate('j1', 'alice', { status: RemoteJobRunStatus.RUNNING, log: 'partial' } as any);

    expect(runModel.state).toMatchObject({ status: RemoteJobRunStatus.SUCCESS, exitCode: 0, log: 'done' });
    expect(jobModel.updateOne).not.toHaveBeenCalled();
  });
});
