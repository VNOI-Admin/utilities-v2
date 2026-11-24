import { signStreamToken, verifyStreamToken } from './stream-token';

const secret = 'test-secret';
const now = Date.UTC(2026, 10, 24, 3, 0, 0);

describe('stream tokens', () => {
  it('verifies a token for the IP it was signed for', () => {
    const token = signStreamToken(secret, '10.10.0.5', now);
    expect(verifyStreamToken(secret, token, '10.10.0.5', now)).toBe(true);
  });

  it('stays the same within a six-hour window so stream URLs do not churn', () => {
    expect(signStreamToken(secret, '10.10.0.5', now)).toBe(signStreamToken(secret, '10.10.0.5', now + 2 * 3600_000));
  });

  it('refuses another IP, another secret, an expired token and garbage', () => {
    const token = signStreamToken(secret, '10.10.0.5', now);
    expect(verifyStreamToken(secret, token, '10.10.0.6', now)).toBe(false);
    expect(verifyStreamToken('other', token, '10.10.0.5', now)).toBe(false);
    expect(verifyStreamToken(secret, token, '10.10.0.5', now + 13 * 3600_000)).toBe(false);
    expect(verifyStreamToken(secret, 'nope', '10.10.0.5', now)).toBe(false);
    expect(verifyStreamToken(secret, '', '10.10.0.5', now)).toBe(false);
  });
});
