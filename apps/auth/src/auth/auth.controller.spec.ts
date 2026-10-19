import { AuthController } from './auth.controller';

describe('AuthController.login', () => {
  const run = async (required: boolean, approved: boolean) => {
    const authService = { login: jest.fn().mockResolvedValue({ accessToken: 'a', refreshToken: 'r' }) };
    const machineAuth = { required: () => required, approvedMachine: jest.fn().mockResolvedValue(approved ? {} : null) };
    const res = { cookie: jest.fn(), json: jest.fn() };
    const controller = new AuthController({ get: () => undefined } as any, authService as any, machineAuth as any);
    await controller.login({ username: 'u', password: 'p' }, {} as any, res as any);
    return { machineOk: authService.login.mock.calls[0][1], machineAuth };
  };

  it('tells the service an unsigned login did not come from an approved machine', async () => {
    expect((await run(true, false)).machineOk).toBe(false);
  });

  it('passes a login signed by an approved machine', async () => {
    expect((await run(true, true)).machineOk).toBe(true);
  });

  it('does not ask for a machine while enforcement is off', async () => {
    const { machineOk, machineAuth } = await run(false, false);
    expect(machineOk).toBe(true);
    expect(machineAuth.approvedMachine).not.toHaveBeenCalled();
  });
});
