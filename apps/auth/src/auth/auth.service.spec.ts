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
    await expect(service.login({ username: 'inactive', password: 'wrong' })).rejects.toThrow(BadRequestException);
  });

  it('still refuses an inactive account with the right password', async () => {
    await expect(service.login({ username: 'inactive', password: 'right' })).rejects.toThrow(ForbiddenException);
  });
});
