import { createHash, createHmac, timingSafeEqual } from 'crypto';

// Shared signing scheme between central and the machine agents (see remote-control-agent.py
// in the image builder): the HMAC key is derived from the machine's WireGuard private key,
// so both sides agree on it without extra provisioning. Central signs job submissions it
// sends to an agent; machines sign requests they send to central (LUKS recovery escrow).
export const AGENT_AUTH_LABEL = 'vnoi-remote-control';
export const AGENT_AUTH_WINDOW_SECONDS = 60;

export function deriveAgentAuthKey(wireGuardPrivateKey: string): Buffer {
  return createHmac('sha256', Buffer.from(wireGuardPrivateKey, 'base64')).update(AGENT_AUTH_LABEL).digest();
}

export function buildAgentAuthMessage(timestamp: string, method: string, path: string, body: Buffer): string {
  const bodyDigest = createHash('sha256').update(body).digest('hex');
  return `${timestamp}\n${method}\n${path}\n${bodyDigest}`;
}

export function signAgentAuth(key: Buffer, timestamp: string, method: string, path: string, body: Buffer): string {
  return createHmac('sha256', key)
    .update(buildAgentAuthMessage(timestamp, method, path, body))
    .digest('hex');
}

export function isValidAgentAuthTimestamp(timestamp: string, nowMs: number = Date.now()): boolean {
  if (!/^\d+$/.test(timestamp)) return false;
  return Math.abs(Math.floor(nowMs / 1000) - Number(timestamp)) <= AGENT_AUTH_WINDOW_SECONDS;
}

export function verifyAgentAuthSignature(
  key: Buffer,
  signature: string,
  timestamp: string,
  method: string,
  path: string,
  body: Buffer,
): boolean {
  const expected = Buffer.from(signAgentAuth(key, timestamp, method, path, body));
  const provided = Buffer.from(signature);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}
