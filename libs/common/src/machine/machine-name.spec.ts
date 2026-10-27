import { machineName, nextFreeName } from './machine-name';

describe('machineName', () => {
  const fp = (prefix: string) => prefix.padEnd(64, '0');

  it('is the same adjective-animal pair for the same fingerprint', () => {
    const fingerprint = fp('3fa2');
    expect(machineName(fingerprint)).toBe(machineName(fingerprint));
    expect(machineName(fingerprint)).toMatch(/^[a-z]+-[a-z]+$/);
  });

  it('picks the words from the first two bytes', () => {
    expect(machineName(fp('0000'))).toBe('amber-alpaca');
    expect(machineName(fp('4040'))).toBe('amber-alpaca');
    expect(machineName(fp('0001'))).toBe('amber-badger');
    expect(machineName(fp('0100'))).toBe('azure-alpaca');
  });

  it('spreads fingerprints over many names', () => {
    const names = new Set(Array.from({ length: 256 }, (_, i) => machineName(fp(i.toString(16).padStart(2, '0') + '5a'))));
    expect(names.size).toBeGreaterThan(32);
  });
});

describe('nextFreeName', () => {
  it('keeps the base name when nobody has it', () => {
    expect(nextFreeName('swift-otter', [])).toBe('swift-otter');
  });

  it('appends -2, -3... past the names already taken', () => {
    expect(nextFreeName('swift-otter', ['swift-otter'])).toBe('swift-otter-2');
    expect(nextFreeName('swift-otter', ['swift-otter', 'swift-otter-2', 'swift-otter-4'])).toBe('swift-otter-3');
  });
});
