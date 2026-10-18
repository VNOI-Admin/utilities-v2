import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

type StoredPort = { port: number; outcome: string; detail?: string | null };

type StoredResult = {
  runId: string;
  target: string;
  vpnIpAddress: string;
  status: string;
  reasons: string[];
  findings: string[];
  anchor: StoredPort;
  blocked: StoredPort[];
  handshakeAgeSeconds?: number | null;
  createdBy: string;
  createdAt: Date;
};

export class FirewallProbePortEntity {
  @Expose()
  @ApiProperty()
  port: number;

  @Expose()
  @ApiProperty({ enum: ['open', 'refused', 'filtered', 'error'] })
  outcome: string;

  @Expose()
  @ApiProperty({ required: false, nullable: true })
  detail: string | null;

  constructor(data: StoredPort) {
    this.port = data.port;
    this.outcome = data.outcome;
    this.detail = data.detail ?? null;
  }
}

export class FirewallProbeResultEntity {
  @Expose()
  @ApiProperty()
  runId: string;

  @Expose()
  @ApiProperty()
  target: string;

  @Expose()
  @ApiProperty()
  vpnIpAddress: string;

  @Expose()
  @ApiProperty({
    enum: ['pass', 'fail', 'unreachable', 'error'],
    description: '"unreachable" and "error" mean the check could not be evaluated, not that it failed',
  })
  status: string;

  @Expose()
  @ApiProperty({ type: [String] })
  reasons: string[];

  @Expose()
  @ApiProperty({ type: [String] })
  findings: string[];

  @Expose()
  @ApiProperty({ type: FirewallProbePortEntity })
  anchor: FirewallProbePortEntity;

  @Expose()
  @ApiProperty({ type: [FirewallProbePortEntity] })
  blocked: FirewallProbePortEntity[];

  @Expose()
  @ApiProperty({ required: false, nullable: true })
  handshakeAgeSeconds: number | null;

  @Expose()
  @ApiProperty()
  createdBy: string;

  @Expose()
  @ApiProperty()
  createdAt: Date;

  constructor(data: StoredResult) {
    this.runId = data.runId;
    this.target = data.target;
    this.vpnIpAddress = data.vpnIpAddress;
    this.status = data.status;
    this.reasons = data.reasons;
    this.findings = data.findings;
    this.anchor = new FirewallProbePortEntity(data.anchor);
    this.blocked = data.blocked.map((port) => new FirewallProbePortEntity(port));
    this.handshakeAgeSeconds = data.handshakeAgeSeconds ?? null;
    this.createdBy = data.createdBy;
    this.createdAt = data.createdAt;
  }
}
