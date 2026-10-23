import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { type Document } from 'mongoose';

export const FIREWALL_PROBE_RESULT_TTL_SECONDS = 30 * 24 * 60 * 60;

export type FirewallProbeResultDocument = FirewallProbeResult & Document;

@Schema({ _id: false })
export class FirewallProbePort {
  @Prop({ required: true })
  port!: number;

  @Prop({ required: true })
  outcome!: string;

  @Prop({ required: false, default: null, type: String })
  detail?: string | null;
}

@Schema()
export class FirewallProbeResult {
  /** Groups the per-machine rows produced by one sweep. */
  @Prop({ required: true })
  runId!: string;

  @Prop({ required: true })
  target!: string;

  @Prop({ required: true })
  vpnIpAddress!: string;

  @Prop({ required: true })
  status!: string;

  /** Stable codes for alerting; `findings` is the prose for a human. */
  @Prop({ type: [String], default: [] })
  reasons!: string[];

  @Prop({ type: [String], default: [] })
  findings!: string[];

  @Prop({ required: true, type: Object })
  anchor!: FirewallProbePort;

  @Prop({ type: [Object], default: [] })
  blocked!: FirewallProbePort[];

  @Prop({ required: false, default: null, type: Number })
  handshakeAgeSeconds?: number | null;

  @Prop({ required: true })
  createdBy!: string;

  @Prop({ required: true, default: () => new Date() })
  createdAt!: Date;
}

export const FirewallProbeResultSchema = SchemaFactory.createForClass(FirewallProbeResult);

FirewallProbeResultSchema.index({ runId: 1, target: 1 }, { unique: true });
FirewallProbeResultSchema.index({ target: 1, createdAt: -1 });
FirewallProbeResultSchema.index({ createdAt: 1 }, { expireAfterSeconds: FIREWALL_PROBE_RESULT_TTL_SECONDS });
