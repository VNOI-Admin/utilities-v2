import { FirewallProbeStatus, type MachineEvidence, type PortOutcome, classifyMachine } from './verdict';

const ANCHOR_PORT = 9010;
const BLOCKED_PORTS = [23, 111, 445, 631];

function evidence(anchor: PortOutcome, blocked: PortOutcome[], handshakeAgeSeconds: number | null = 30): MachineEvidence {
  return {
    anchor: { port: ANCHOR_PORT, outcome: anchor },
    blocked: blocked.map((outcome, index) => ({ port: BLOCKED_PORTS[index], outcome })),
    handshakeAgeSeconds,
    handshakeMaxAgeSeconds: 900,
  };
}

const allFiltered: PortOutcome[] = ['filtered', 'filtered', 'filtered', 'filtered'];

describe('classifyMachine', () => {
  it('passes a machine that answers the anchor and is silent on every must-drop port', () => {
    const verdict = classifyMachine(evidence('open', allFiltered));

    expect(verdict.status).toBe(FirewallProbeStatus.PASS);
    expect(verdict.reasons).toEqual([]);
  });

  it('passes when the anchor resets, since the host still proved it is there', () => {
    // Agent process dead but the ruleset intact: iptables accepts the port, the kernel resets it.
    const verdict = classifyMachine(evidence('refused', allFiltered));

    expect(verdict.status).toBe(FirewallProbeStatus.PASS);
  });

  it('fails a machine that resets a must-drop port', () => {
    const verdict = classifyMachine(evidence('open', ['filtered', 'refused', 'filtered', 'filtered']));

    expect(verdict.status).toBe(FirewallProbeStatus.FAIL);
    expect(verdict.reasons).toEqual(['blocked-port-refused']);
    expect(verdict.findings.join(' ')).toContain('111');
  });

  it('fails a machine that accepts a connection on a must-drop port', () => {
    const verdict = classifyMachine(evidence('open', ['open', 'filtered', 'filtered', 'filtered']));

    expect(verdict.status).toBe(FirewallProbeStatus.FAIL);
    expect(verdict.reasons).toEqual(['blocked-port-open']);
  });

  it('reports one reason code per kind, not per port', () => {
    const verdict = classifyMachine(evidence('open', ['refused', 'refused', 'open', 'filtered']));

    expect(verdict.reasons.sort()).toEqual(['blocked-port-open', 'blocked-port-refused']);
    expect(verdict.findings).toHaveLength(3);
  });

  it('cannot evaluate a machine that is simply not answering', () => {
    const verdict = classifyMachine(evidence('filtered', allFiltered, null));

    expect(verdict.status).toBe(FirewallProbeStatus.UNREACHABLE);
    expect(verdict.reasons).toEqual(['host-silent']);
    expect(verdict.findings.join(' ')).toMatch(/powered off/i);
  });

  it('does not fail a powered-off machine even though its must-drop ports are silent', () => {
    expect(classifyMachine(evidence('filtered', allFiltered, null)).status).not.toBe(FirewallProbeStatus.FAIL);
  });

  it('does not fail a powered-off machine whose handshake went stale with it', () => {
    const verdict = classifyMachine(evidence('filtered', allFiltered, 86_400));

    expect(verdict.status).toBe(FirewallProbeStatus.UNREACHABLE);
    expect(verdict.reasons).toEqual(['host-silent']);
  });

  it('separates a central-side probe fault from a machine verdict', () => {
    const verdict = classifyMachine({
      ...evidence('error', allFiltered),
      anchor: { port: ANCHOR_PORT, outcome: 'error', detail: 'ENETUNREACH' },
    });

    expect(verdict.status).toBe(FirewallProbeStatus.ERROR);
    expect(verdict.reasons).toEqual(['probe-error']);
    expect(verdict.findings.join(' ')).toContain('ENETUNREACH');
  });

  it('fails a live machine whose tunnel shows no recent handshake', () => {
    const verdict = classifyMachine(evidence('open', allFiltered, 3_600));

    expect(verdict.status).toBe(FirewallProbeStatus.FAIL);
    expect(verdict.reasons).toEqual(['tunnel-handshake-stale']);
  });

  it('treats missing handshake data as no evidence rather than a failure', () => {
    const verdict = classifyMachine(evidence('open', allFiltered, null));

    expect(verdict.status).toBe(FirewallProbeStatus.PASS);
  });

  it('keeps a fresh handshake inside the window out of the verdict', () => {
    expect(classifyMachine(evidence('open', allFiltered, 900)).status).toBe(FirewallProbeStatus.PASS);
    expect(classifyMachine(evidence('open', allFiltered, 901)).status).toBe(FirewallProbeStatus.FAIL);
  });

  it('cannot evaluate when the anchor answered but no must-drop probe got through', () => {
    const verdict = classifyMachine(evidence('open', ['error', 'error', 'error', 'error']));

    expect(verdict.status).toBe(FirewallProbeStatus.ERROR);
    expect(verdict.reasons).toEqual(['blocked-ports-inconclusive']);
  });

  it('still judges on the must-drop ports that did get through', () => {
    expect(classifyMachine(evidence('open', ['error', 'filtered', 'error', 'error'])).status).toBe(
      FirewallProbeStatus.PASS,
    );
    expect(classifyMachine(evidence('open', ['error', 'refused', 'error', 'error'])).status).toBe(
      FirewallProbeStatus.FAIL,
    );
  });
});
