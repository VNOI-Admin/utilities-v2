import { REACTION_RENDER_QUEUE } from '@libs/common/queues/reaction-queue';

export const QUEUE_NAMES = {
  PING_USERS: 'ping-users',
  SYNC_SUBMISSIONS: 'sync-submissions',
  PROCESS_REACTIONS: 'process-reactions',
  /** One job per submission; worker uses concurrency 1 for serialized ffmpeg. */
  REACTION_RENDER: REACTION_RENDER_QUEUE,
  /** Pulls the integrity/audit report from every machine through the remote-control agent. */
  SECURITY_REPORT: 'security-report',
  /** Probes every machine's firewall from central, without asking the machine anything. */
  FIREWALL_PROBE: 'firewall-probe',
} as const;

export {
  REACTION_RENDER_JOB_NAME,
  reactionRenderJobId,
  type ReactionRenderJobData,
} from '@libs/common/queues/reaction-queue';
