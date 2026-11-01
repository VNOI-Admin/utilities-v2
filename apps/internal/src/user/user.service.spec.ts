import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdateUserDto } from './dtos/updateUser.dto';
import { UserService } from './user.service';

const KEY = 'a'.repeat(48);

function serviceWith(user: Record<string, any>) {
  const userModel = { findOne: jest.fn().mockResolvedValue(user) };
  return new UserService(userModel as any, {} as any, {} as any, {} as any);
}

function stored(apiKey: string | null) {
  return { username: 'u1', fullName: 'U', isActive: true, role: 'contestant', apiKey, machineUsage: {}, save: jest.fn() };
}

describe('UserService.updateUser apiKey', () => {
  it.each([null, ''])('clears the key when PATCHed with %p', async (value) => {
    const user = stored(KEY);
    await serviceWith(user).updateUser('u1', { apiKey: value } as UpdateUserDto);
    expect(user.apiKey).toBeNull();
  });

  it('keeps the key when the PATCH does not mention it', async () => {
    const user = stored(KEY);
    await serviceWith(user).updateUser('u1', { fullName: 'New' } as UpdateUserDto);
    expect(user.apiKey).toBe(KEY);
  });

  it('accepts null or an empty string to clear, and still rejects a malformed key', async () => {
    const errors = async (apiKey: unknown) => (await validate(plainToInstance(UpdateUserDto, { apiKey }))).length;
    expect(await errors(null)).toBe(0);
    expect(await errors('')).toBe(0);
    expect(await errors(KEY)).toBe(0);
    expect(await errors('short')).toBeGreaterThan(0);
  });
});
