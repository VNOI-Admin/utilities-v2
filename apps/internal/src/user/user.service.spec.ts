import { BadRequestException } from '@nestjs/common';
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

function docServiceWith(user: Record<string, unknown>) {
  const doc = {
    machineUsage: { cpu: 0, memory: 0, disk: 0, ping: 0, isOnline: false, lastReportedAt: new Date(0) },
    ...user,
    save: jest.fn(async () => doc),
    deleteOne: jest.fn(async () => undefined),
  };
  const userModel = { findOne: jest.fn(async () => doc) };
  const groupModel = { findOne: jest.fn(async ({ code }: { code: string }) => (code === 'HUST' ? { code } : null)) };
  const service = new UserService(userModel as any, groupModel as any, { get: () => undefined } as any, {} as any);
  return { service, doc };
}

describe('UserService.updateUser group', () => {
  it('clears the group when null is sent', async () => {
    const { service, doc } = docServiceWith({ username: 'uet_01', role: 'contestant', group: 'UET_VNU' });
    await service.updateUser('uet_01', { group: null } as any);
    expect(doc.group).toBeUndefined();
    expect(doc.save).toHaveBeenCalled();
  });

  it('keeps the group when the field is left out', async () => {
    const { service, doc } = docServiceWith({ username: 'uet_01', role: 'contestant', group: 'UET_VNU' });
    await service.updateUser('uet_01', { fullName: 'UET Mocha' } as any);
    expect(doc.group).toBe('UET_VNU');
  });

  it('moves the user to an existing group', async () => {
    const { service, doc } = docServiceWith({ username: 'uet_01', role: 'contestant', group: 'UET_VNU' });
    await service.updateUser('uet_01', { group: 'HUST' } as any);
    expect(doc.group).toBe('HUST');
  });
});

describe('UserService.deleteUser', () => {
  it('refuses to delete the admin account', async () => {
    const { service, doc } = docServiceWith({ username: 'admin', role: 'admin' });
    await expect(service.deleteUser('admin')).rejects.toThrow(BadRequestException);
    expect(doc.deleteOne).not.toHaveBeenCalled();
  });

  it('deletes other accounts', async () => {
    const { service, doc } = docServiceWith({ username: 'uet_01', role: 'contestant' });
    await expect(service.deleteUser('uet_01')).resolves.toEqual({ success: true });
    expect(doc.deleteOne).toHaveBeenCalled();
  });
});
