import {
  AGENT_AUTH_LABEL,
  deriveAgentAuthKey,
  isValidAgentAuthTimestamp,
  signAgentAuth,
  verifyAgentAuthSignature,
} from './agent-auth';

// Known-answer fixtures computed with the reference implementation
// (remote-control-agent.py in the image builder), pinning the wire format.
const PRIVATE_KEY = Buffer.alloc(32, 7).toString('base64');
const BODY = Buffer.from('{"recoveryPassphrase":"s3cret"}');
const TIMESTAMP = '1780000000';
const PATH = '/machine/luks-escrow';
const SIGNATURE = 'bd9d4ee1e43ebb58cd61594327f790c3510b402cb04c64ac347944ac8c7af238';

describe('agent-auth', () => {
  it('derives the key with the shared label', () => {
    expect(AGENT_AUTH_LABEL).toBe('vnoi-remote-control');
    expect(deriveAgentAuthKey(PRIVATE_KEY).toString('hex')).toBe(
      'ae63ed16426e6958f3dd64c3ce6771bcf99d07ab0a30161e81743e0da6cd9fef',
    );
  });

  it('signs timestamp, method, path and body digest exactly like the agent', () => {
    expect(signAgentAuth(deriveAgentAuthKey(PRIVATE_KEY), TIMESTAMP, 'POST', PATH, BODY)).toBe(SIGNATURE);
  });

  it('verifies a correct signature and rejects any other', () => {
    const key = deriveAgentAuthKey(PRIVATE_KEY);
    expect(verifyAgentAuthSignature(key, SIGNATURE, TIMESTAMP, 'POST', PATH, BODY)).toBe(true);
    expect(verifyAgentAuthSignature(key, SIGNATURE, TIMESTAMP, 'GET', PATH, BODY)).toBe(false);
    expect(verifyAgentAuthSignature(key, SIGNATURE, TIMESTAMP, 'POST', '/other', BODY)).toBe(false);
    expect(verifyAgentAuthSignature(key, SIGNATURE, '1780000001', 'POST', PATH, BODY)).toBe(false);
    expect(verifyAgentAuthSignature(key, SIGNATURE, TIMESTAMP, 'POST', PATH, Buffer.from('other'))).toBe(false);
    expect(verifyAgentAuthSignature(deriveAgentAuthKey(Buffer.alloc(32, 9).toString('base64')), SIGNATURE, TIMESTAMP, 'POST', PATH, BODY)).toBe(false);
  });

  it('accepts only numeric timestamps within the window', () => {
    const now = 1780000000000;
    expect(isValidAgentAuthTimestamp('1780000000', now)).toBe(true);
    expect(isValidAgentAuthTimestamp(String(1780000000 - 60), now)).toBe(true);
    expect(isValidAgentAuthTimestamp(String(1780000000 - 61), now)).toBe(false);
    expect(isValidAgentAuthTimestamp(String(1780000000 + 61), now)).toBe(false);
    expect(isValidAgentAuthTimestamp('now', now)).toBe(false);
    expect(isValidAgentAuthTimestamp('-1780000000', now)).toBe(false);
  });
});
