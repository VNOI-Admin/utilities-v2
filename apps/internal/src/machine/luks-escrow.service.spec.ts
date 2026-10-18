import { LuksEscrowService } from './luks-escrow.service';

function makeModel() {
  return {
    findOneAndUpdate: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };
}

function dto(passphrase: string) {
  return { recoveryPassphrase: passphrase };
}

describe('LuksEscrowService.escrow', () => {
  it('upserts the passphrase for the machine, stripping a trailing newline', async () => {
    const model = makeModel();
    const stored = { username: 'machine-1', recoveryPassphrase: 'pass', escrowedAt: new Date(), updatedAt: new Date() };
    model.findOneAndUpdate.mockResolvedValue({ toObject: () => stored });
    const service = new LuksEscrowService(model as any);

    await expect(service.escrow('machine-1', dto('pass\n'), 20)).resolves.toEqual(stored);

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      { username: 'machine-1' },
      expect.objectContaining({
        $set: expect.objectContaining({ recoveryPassphrase: 'pass' }),
        $setOnInsert: expect.objectContaining({ escrowedAt: expect.any(Date) }),
      }),
      { upsert: true, new: true },
    );
  });

  it('rejects a request body over the size limit', async () => {
    const service = new LuksEscrowService(makeModel() as any);

    await expect(service.escrow('machine-1', dto('pass'), 4097)).rejects.toThrow('Request body too large');
  });

  it('rejects an empty passphrase (also after newline stripping)', async () => {
    const service = new LuksEscrowService(makeModel() as any);

    await expect(service.escrow('machine-1', dto('\n'), 2)).rejects.toThrow('1-512 characters');
    await expect(service.escrow('machine-1', dto('x'.repeat(513)), 515)).rejects.toThrow('1-512 characters');
  });

  it('rejects an embedded newline', async () => {
    const service = new LuksEscrowService(makeModel() as any);

    await expect(service.escrow('machine-1', dto('two\nlines'), 10)).rejects.toThrow('single line');
  });

  it('keeps the first escrowedAt across updates', async () => {
    const model = makeModel();
    model.findOneAndUpdate.mockResolvedValue({ toObject: () => ({}) });
    const service = new LuksEscrowService(model as any);

    await service.escrow('machine-1', dto('pass'), 20);

    expect(model.findOneAndUpdate.mock.calls[0][1].$setOnInsert.escrowedAt).toBeInstanceOf(Date);
    expect(model.findOneAndUpdate.mock.calls[0][1].$set.updatedAt).toBeInstanceOf(Date);
  });
});

describe('LuksEscrowService read paths', () => {
  it('lists recoveries without the passphrase field', async () => {
    const model = makeModel();
    const lean = jest.fn().mockResolvedValue([]);
    const sort = jest.fn().mockReturnValue({ lean });
    const select = jest.fn().mockReturnValue({ sort });
    model.find.mockReturnValue({ select });
    const service = new LuksEscrowService(model as any);

    await expect(service.list()).resolves.toEqual([]);
    expect(select).toHaveBeenCalledWith('-recoveryPassphrase');
  });

  it('reads one recovery including the passphrase', async () => {
    const model = makeModel();
    const recovery = { username: 'machine-1', recoveryPassphrase: 'pass' };
    model.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(recovery) });
    const service = new LuksEscrowService(model as any);

    await expect(service.getForMachine('machine-1')).resolves.toEqual(recovery);
    expect(model.findOne).toHaveBeenCalledWith({ username: 'machine-1' });
  });

  it('throws not found for a machine without escrow', async () => {
    const model = makeModel();
    model.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    const service = new LuksEscrowService(model as any);

    await expect(service.getForMachine('ghost')).rejects.toThrow('No escrowed recovery passphrase');
  });
});
