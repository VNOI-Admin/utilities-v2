export enum FirewallProbeStatus {
  PASS = 'pass',
  FAIL = 'fail',
  UNREACHABLE = 'unreachable',
  ERROR = 'error',
}

/**
 * How the machine's TCP stack reacted. `filtered` means nothing came back at all,
 * which is the only outcome a default-DROP INPUT chain can produce.
 */
export type PortOutcome = 'open' | 'refused' | 'filtered' | 'error';

export type PortProbeResult = {
  port: number;
  outcome: PortOutcome;
  detail?: string;
};

export type MachineEvidence = {
  /** A port the ruleset explicitly ACCEPTs from the admin subnet; used only to prove the host is there. */
  anchor: PortProbeResult;
  /** Ports no rule permits. Each must come back `filtered`. */
  blocked: PortProbeResult[];
  /** From the WireGuard server, not from the machine. `null` when wg-portal reported nothing. */
  handshakeAgeSeconds: number | null;
  handshakeMaxAgeSeconds: number;
};

export type MachineVerdict = {
  status: FirewallProbeStatus;
  reasons: string[];
  findings: string[];
};

export function classifyMachine(evidence: MachineEvidence): MachineVerdict {
  const { anchor, blocked, handshakeAgeSeconds, handshakeMaxAgeSeconds } = evidence;

  if (anchor.outcome === 'error') {
    return {
      status: FirewallProbeStatus.ERROR,
      reasons: ['probe-error'],
      findings: [
        `Probe of ${anchor.port} failed before reaching the machine (${anchor.detail ?? 'unknown error'}). This is a central-side fault - the firewall was not evaluated.`,
      ],
    };
  }

  if (anchor.outcome === 'filtered') {
    return {
      status: FirewallProbeStatus.UNREACHABLE,
      reasons: ['host-silent'],
      findings: [
        `No TCP answer on ${anchor.port}, a port the ruleset accepts from the admin subnet. Powered off, asleep, mid-reboot or off the tunnel - and also what an intact firewall looks like on an idle machine, so nothing is concluded.`,
      ],
    };
  }

  // `open` or `refused` on the anchor: the machine's TCP stack answered, so silence
  // further down is the machine's choice rather than its absence.
  const reasons: string[] = [];
  const findings: string[] = [];

  for (const probe of blocked) {
    if (probe.outcome === 'open') {
      reasons.push('blocked-port-open');
      findings.push(`Port ${probe.port} completed a TCP handshake. No rule in the shipped ruleset accepts it.`);
    } else if (probe.outcome === 'refused') {
      reasons.push('blocked-port-refused');
      findings.push(
        `Port ${probe.port} answered with a TCP reset. A chain with policy DROP is silent even when nothing listens, so the INPUT chain is not the shipped one.`,
      );
    }
  }

  if (handshakeAgeSeconds !== null && handshakeAgeSeconds > handshakeMaxAgeSeconds) {
    reasons.push('tunnel-handshake-stale');
    findings.push(
      `Machine answered on its tunnel address but the WireGuard server's last handshake with its peer is ${handshakeAgeSeconds}s old (limit ${handshakeMaxAgeSeconds}s). WireGuard rekeys every two minutes under traffic, so the packets we just exchanged did not cross the tunnel.`,
    );
  }

  if (reasons.length > 0) {
    return { status: FirewallProbeStatus.FAIL, reasons: [...new Set(reasons)], findings };
  }

  const silent = blocked.filter((probe) => probe.outcome === 'filtered');
  if (silent.length === 0) {
    return {
      status: FirewallProbeStatus.ERROR,
      reasons: ['blocked-ports-inconclusive'],
      findings: [
        'Machine answered on the anchor port but every must-drop probe errored out before reaching it; ' +
          'no usable evidence either way.',
      ],
    };
  }

  return {
    status: FirewallProbeStatus.PASS,
    reasons: [],
    findings: [
      `Answered on ${anchor.port} and stayed silent on ${silent.length} must-drop port(s) ` +
        `(${silent.map((probe) => probe.port).join(', ')}).`,
    ],
  };
}
