import { WgPortalApi } from '@libs/api/wg-portal';
import { FirewallProbeResult, type FirewallProbeResultDocument } from '@libs/common-db/schemas/firewallProbe.schema';
import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import { Role } from '@libs/common/decorators/role.decorator';
import { getErrorMessage } from '@libs/common/helper/error';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as uuid from 'uuid';
import { PORT_PROBE, type PortProbe } from './tcp-probe';
import { type PortProbeResult, classifyMachine } from './verdict';

const DEFAULT_AGENT_PORT = 9010;
/**
 * Ports the shipped ruleset has no ACCEPT for. Any TCP answer on one of them -
 * a reset included - means the INPUT chain is not the shipped one.
 */
const DEFAULT_BLOCKED_PORTS = [23, 111, 445, 631];
const DEFAULT_PROBE_TIMEOUT_MS = 2000;
const DEFAULT_HANDSHAKE_MAX_AGE_SECONDS = 900;
const PROBE_CONCURRENCY = 16;

type ProbeTarget = {
  username: string;
  vpnIpAddress: string;
  publicKey: string | null;
};

export type FirewallProbeRun = {
  runId: string;
  results: FirewallProbeResult[];
};

@Injectable()
export class FirewallProbeService {
  private readonly logger = new Logger(FirewallProbeService.name);
  private readonly agentPort: number;
  private readonly blockedPorts: number[];
  private readonly probeTimeoutMs: number;
  private readonly handshakeMaxAgeSeconds: number;
  private readonly interfaceId: string;
  private readonly wgPortalApi: WgPortalApi | null;

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(FirewallProbeResult.name)
    private readonly resultModel: Model<FirewallProbeResultDocument>,
    @Inject(PORT_PROBE) private readonly probePort: PortProbe,
    configService: ConfigService,
  ) {
    this.agentPort = Number(configService.get('REMOTE_CONTROL_AGENT_PORT')) || DEFAULT_AGENT_PORT;
    this.blockedPorts = parsePorts(configService.get<string>('FIREWALL_PROBE_BLOCKED_PORTS')) ?? DEFAULT_BLOCKED_PORTS;
    this.probeTimeoutMs = Number(configService.get('FIREWALL_PROBE_TIMEOUT_MS')) || DEFAULT_PROBE_TIMEOUT_MS;
    this.handshakeMaxAgeSeconds =
      Number(configService.get('FIREWALL_PROBE_HANDSHAKE_MAX_AGE_SECONDS')) || DEFAULT_HANDSHAKE_MAX_AGE_SECONDS;
    this.interfaceId = configService.get<string>('WG_PORTAL_INTERFACE_ID') ?? 'wg0';

    const baseURL = configService.get<string>('WG_PORTAL_BASE_URL');
    const username = configService.get<string>('WG_PORTAL_CORE_ADMIN_USER');
    const password = configService.get<string>('WG_PORTAL_CORE_ADMIN_API_TOKEN');
    // Without wg-portal the port probes still stand on their own; the tunnel
    // correlation just reports "no handshake data" instead of failing machines.
    this.wgPortalApi = baseURL && username && password ? new WgPortalApi({ baseURL, username, password }) : null;
    if (!this.wgPortalApi) {
      this.logger.warn('wg-portal is not configured; firewall probes will skip the tunnel handshake correlation');
    }
  }

  async runProbe(createdBy: string, targets?: string[]): Promise<FirewallProbeRun | null> {
    const machines = await this.resolveTargets(targets);
    if (machines.length === 0) return null;

    const runId = uuid.v4();
    const createdAt = new Date();
    const results: FirewallProbeResult[] = [];

    for (let index = 0; index < machines.length; index += PROBE_CONCURRENCY) {
      const batch = machines.slice(index, index + PROBE_CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map((machine) => this.probeMachine(machine, runId, createdBy, createdAt)),
      );
      results.push(...batchResults);
    }

    await this.resultModel.insertMany(results);

    const failed = results.filter((result) => result.status === 'fail').length;
    this.logger.log(`Firewall probe ${runId}: ${results.length} machines, ${failed} failed`);

    return { runId, results };
  }

  async getLatestResults(): Promise<FirewallProbeResult[]> {
    const rows = await this.resultModel.aggregate<FirewallProbeResult>([
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$target', latest: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$latest' } },
      { $sort: { target: 1 } },
    ]);
    return rows;
  }

  async getResultsForTarget(target: string, limit: number): Promise<FirewallProbeResult[]> {
    return this.resultModel.find({ target }).sort({ createdAt: -1 }).limit(limit).lean<FirewallProbeResult[]>();
  }

  private async probeMachine(
    machine: ProbeTarget,
    runId: string,
    createdBy: string,
    createdAt: Date,
  ): Promise<FirewallProbeResult> {
    const [anchor, blocked, handshakeAgeSeconds] = await Promise.all([
      this.probePort(machine.vpnIpAddress, this.agentPort, this.probeTimeoutMs),
      Promise.all(this.blockedPorts.map((port) => this.probePort(machine.vpnIpAddress, port, this.probeTimeoutMs))),
      this.getHandshakeAgeSeconds(machine),
    ]);

    const verdict = classifyMachine({
      anchor,
      blocked,
      handshakeAgeSeconds,
      handshakeMaxAgeSeconds: this.handshakeMaxAgeSeconds,
    });

    return {
      runId,
      target: machine.username,
      vpnIpAddress: machine.vpnIpAddress,
      status: verdict.status,
      reasons: verdict.reasons,
      findings: verdict.findings,
      anchor: toStoredPort(anchor),
      blocked: blocked.map(toStoredPort),
      handshakeAgeSeconds,
      createdBy,
      createdAt,
    };
  }

  private async getHandshakeAgeSeconds(machine: ProbeTarget): Promise<number | null> {
    if (!this.wgPortalApi || !machine.publicKey) return null;

    try {
      const metrics = await this.wgPortalApi.getPeerMetrics(machine.publicKey);
      if (!metrics?.LastHandshake) return null;
      const handshake = new Date(metrics.LastHandshake).getTime();
      if (Number.isNaN(handshake)) return null;
      return Math.max(0, Math.round((Date.now() - handshake) / 1000));
    } catch (error) {
      // A wg-portal outage must not turn into a fleet-wide tamper alert.
      this.logger.warn(`No wg-portal metrics for ${machine.username}: ${getErrorMessage(error)}`);
      return null;
    }
  }

  private async resolveTargets(targets?: string[]): Promise<ProbeTarget[]> {
    const filter: Record<string, unknown> = {
      vpnIpAddress: { $ne: null },
      'keyPair.privateKey': { $ne: null },
    };
    if (targets?.length) {
      filter.username = { $in: targets };
    } else {
      filter.role = { $in: [Role.CONTESTANT, Role.GUEST] };
      filter.isActive = true;
    }

    const users = await this.userModel
      .find(filter)
      .select('username vpnIpAddress keyPair.publicKey')
      .lean<{ username: string; vpnIpAddress: string; keyPair?: { publicKey?: string | null } }[]>();

    return users
      .map((user) => ({
        username: user.username,
        vpnIpAddress: user.vpnIpAddress,
        publicKey: user.keyPair?.publicKey ?? null,
      }))
      .sort((a, b) => a.username.localeCompare(b.username));
  }
}

function toStoredPort(probe: PortProbeResult) {
  return { port: probe.port, outcome: probe.outcome, detail: probe.detail ?? null };
}

function parsePorts(raw?: string): number[] | null {
  if (!raw) return null;
  const ports = raw
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((port) => Number.isInteger(port) && port > 0 && port < 65536);
  return ports.length > 0 ? ports : null;
}
