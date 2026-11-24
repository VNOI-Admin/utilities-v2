import { createHmac, timingSafeEqual } from 'crypto';

const WINDOW_SECONDS = 6 * 3600;

function signature(secret: string, ip: string, expiresAt: number): string {
  return createHmac('sha256', secret).update(`stream:${ip}:${expiresAt}`).digest('base64url');
}

export function signStreamToken(secret: string, ip: string, now = Date.now()): string {
  const expiresAt = (Math.ceil(now / 1000 / WINDOW_SECONDS) + 1) * WINDOW_SECONDS;
  return `${expiresAt}.${signature(secret, ip, expiresAt)}`;
}

export function verifyStreamToken(secret: string, token: string, ip: string, now = Date.now()): boolean {
  const [expires, sig] = token.split('.');
  const expiresAt = Number(expires);
  if (!sig || !Number.isInteger(expiresAt) || expiresAt * 1000 <= now) return false;
  const expected = Buffer.from(signature(secret, ip, expiresAt));
  const given = Buffer.from(sig);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
