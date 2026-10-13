import { createHash, createPublicKey, verify } from 'crypto';
import { Readable } from 'stream';

import { Role } from '../decorators/role.decorator';

export const MACHINE_ID_HEADER = 'x-vnoi-machine';
export const MACHINE_NONCE_HEADER = 'x-vnoi-nonce';
export const MACHINE_SIGNATURE_HEADER = 'x-vnoi-signature';
export const MACHINE_NONCE_TTL_MS = 60_000;

export const MACHINE_BOUND_ROLES: string[] = [Role.CONTESTANT, Role.GUEST];

// Crockford base32: no I, L, O or U, so a code read off a screen has one spelling.
const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

const sha256 = (data: Buffer) => createHash('sha256').update(data).digest();

export function machineFingerprint(publicKey: Buffer): string {
  return sha256(publicKey).toString('hex');
}

// Bound to the key, not random: whoever reads the code off the screen still cannot enroll a key under it.
export function machineCode(publicKey: Buffer): string {
  const bits = sha256(publicKey).readBigUInt64BE(0) >> 14n;
  let code = '';
  for (let shift = 45n; shift >= 0n; shift -= 5n) code += CODE_ALPHABET[Number((bits >> shift) & 31n)];
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

export function normalizeMachineCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  if (code.length !== 10 || [...code].some((c) => !CODE_ALPHABET.includes(c))) return null;
  return `${code.slice(0, 5)}-${code.slice(5)}`;
}

export function machineMessage(nonce: string, method: string, path: string, body: Buffer): Buffer {
  return Buffer.from(`${nonce}\n${method}\n${path}\n${sha256(body).toString('hex')}`);
}

export function verifyMachineSignature(
  publicKey: string,
  signature: string,
  nonce: string,
  method: string,
  path: string,
  body: Buffer,
): boolean {
  try {
    const x = Buffer.from(publicKey, 'base64').toString('base64url');
    const key = createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x }, format: 'jwk' });
    return verify(null, machineMessage(nonce, method, path, body), key, Buffer.from(signature, 'base64'));
  } catch {
    return false;
  }
}

// Guards run before multer, so a signed multipart body is read here and multer gets a replay of the same bytes.
export async function requestBody(req: any): Promise<Buffer> {
  if (req.rawBody) return req.rawBody;
  if (!String(req.headers['content-type'] ?? '').startsWith('multipart/form-data')) return Buffer.alloc(0);
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk);
  req.rawBody = Buffer.concat(chunks);
  const replay = Readable.from([req.rawBody]);
  req.pipe = (dest: NodeJS.WritableStream) => replay.pipe(dest);
  req.unpipe = (dest: NodeJS.WritableStream) => {
    replay.unpipe(dest);
    return req;
  };
  return req.rawBody;
}
