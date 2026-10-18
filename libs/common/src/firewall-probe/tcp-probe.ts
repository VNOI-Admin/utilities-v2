import { connect } from 'net';
import type { PortOutcome, PortProbeResult } from './verdict';

export type PortProbe = (host: string, port: number, timeoutMs: number) => Promise<PortProbeResult>;

export const PORT_PROBE = 'FIREWALL_PORT_PROBE';

const OUTCOME_BY_CODE: Record<string, PortOutcome> = {
  ECONNREFUSED: 'refused',
  ECONNRESET: 'refused',
  ETIMEDOUT: 'filtered',
};

export const probeTcpPort: PortProbe = (host, port, timeoutMs) =>
  new Promise<PortProbeResult>((resolve) => {
    const socket = connect({ host, port, timeout: timeoutMs });

    const finish = (outcome: PortOutcome, detail?: string) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(detail ? { port, outcome, detail } : { port, outcome });
    };

    socket.once('connect', () => finish('open'));
    socket.once('timeout', () => finish('filtered'));
    socket.once('error', (error: NodeJS.ErrnoException) => {
      const code = error.code ?? '';
      finish(OUTCOME_BY_CODE[code] ?? 'error', code || error.message);
    });
  });
