import { generateKeyPairSync, sign } from 'crypto';

import { machineCode, machineMessage, normalizeMachineCode, verifyMachineSignature } from './machine-auth';

describe('machineCode', () => {
  it('is the first 50 bits of sha256(public key) in Crockford base32, grouped 5-5', () => {
    expect(machineCode(Buffer.alloc(32))).toBe('CSM7N-BFRCA');
    expect(machineCode(Buffer.from([...Array(32).keys()]))).toBe('CC6WT-AB6RG');
  });
});

describe('normalizeMachineCode', () => {
  it('accepts what an admin types off the screen', () => {
    expect(normalizeMachineCode(' csm7n bfrca ')).toBe('CSM7N-BFRCA');
    expect(normalizeMachineCode('CSM7NBFRCA')).toBe('CSM7N-BFRCA');
    expect(normalizeMachineCode('0OIL1-00000')).toBe('00111-00000');
  });

  it('rejects anything that is not ten code characters', () => {
    expect(normalizeMachineCode('CSM7N-BFRC')).toBeNull();
    expect(normalizeMachineCode('CSM7N-BFRCAU')).toBeNull();
  });
});

describe('verifyMachineSignature', () => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  const raw = Buffer.from(publicKey.export({ format: 'jwk' }).x as string, 'base64url').toString('base64');
  const body = Buffer.from('username=a&password=b');
  const signature = sign(null, machineMessage('n1', 'POST', '/auth/auth/login', body), privateKey).toString('base64');

  it('accepts the signature over nonce, method, path and body hash', () => {
    expect(verifyMachineSignature(raw, signature, 'n1', 'POST', '/auth/auth/login', body)).toBe(true);
  });

  it.each([
    ['nonce', 'n2', 'POST', '/auth/auth/login', body],
    ['method', 'n1', 'GET', '/auth/auth/login', body],
    ['path', 'n1', 'POST', '/user/vpn/config', body],
    ['body', 'n1', 'POST', '/auth/auth/login', Buffer.from('username=a&password=c')],
  ])('rejects a changed %s', (_, nonce, method, path, changed) => {
    expect(verifyMachineSignature(raw, signature, nonce, method, path, changed)).toBe(false);
  });

  it('rejects garbage instead of throwing', () => {
    expect(verifyMachineSignature('not-a-key', signature, 'n1', 'POST', '/auth/auth/login', body)).toBe(false);
    expect(verifyMachineSignature(raw, '!!', 'n1', 'POST', '/auth/auth/login', body)).toBe(false);
  });
});
