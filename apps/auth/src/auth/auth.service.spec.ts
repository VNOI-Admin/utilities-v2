import { BadRequestException, ForbiddenException } from '@nestjs/common';
import * as argon2 from 'argon2';

import { AuthService } from './auth.service';

describe('AuthService.login', () => {
  let service: AuthService;

  beforeAll(async () => {
    const user = { username: 'inactive', password: await argon2.hash('right'), isActive: false, role: 'contestant' };
    const userModel = { findOne: () => ({ lean: async () => user }) };
    service = new AuthService(userModel as any, {} as any, {} as any, {} as any);
  });

  it('does not reveal that an account is inactive to a wrong password', async () => {
    await expect(service.login({ username: 'inactive', password: 'wrong' }, true)).rejects.toThrow(BadRequestException);
  });

  it('still refuses an inactive account with the right password', async () => {
    await expect(service.login({ username: 'inactive', password: 'right' }, true)).rejects.toThrow(ForbiddenException);
  });
});

describe('AuthService.login from a machine that is not approved', () => {
  const login = async (role: string, machineOk: boolean) => {
    const user = { username: role, password: await argon2.hash('right'), isActive: true, role };
    const userModel = { findOne: () => ({ lean: async () => user }), updateOne: async () => ({}) };
    const systemConfigModel = { findOne: () => ({ lean: async () => null }) };
    const jwt = { signAsync: async () => 'token' };
    const service = new AuthService(userModel as any, systemConfigModel as any, jwt as any, { get: () => '1m' } as any);
    return service.login({ username: role, password: 'right' }, machineOk);
  };

  it.each(['contestant', 'guest'])('refuses a %s', async (role) => {
    await expect(login(role, false)).rejects.toThrow('machine not approved');
  });

  it.each(['admin', 'coach'])('still signs in an %s', async (role) => {
    await expect(login(role, false)).resolves.toHaveProperty('accessToken', 'token');
  });

  it('signs in a contestant from an approved machine', async () => {
    await expect(login('contestant', true)).resolves.toHaveProperty('accessToken', 'token');
  });

  it('checks the password before saying anything about the machine', async () => {
    const user = { username: 'c', password: await argon2.hash('right'), isActive: true, role: 'contestant' };
    const service = new AuthService({ findOne: () => ({ lean: async () => user }) } as any, {} as any, {} as any, {} as any);
    await expect(service.login({ username: 'c', password: 'wrong' }, false)).rejects.toThrow(BadRequestException);
  });
});
