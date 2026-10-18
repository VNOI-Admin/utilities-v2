import { FirewallProbeService } from '@libs/common/firewall-probe/firewall-probe.service';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { QUEUE_NAMES } from '../constants';

@Processor(QUEUE_NAMES.FIREWALL_PROBE)
export class FirewallProbeProcessor extends WorkerHost {
  private readonly logger = new Logger(FirewallProbeProcessor.name);

  constructor(private readonly firewallProbeService: FirewallProbeService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.id} - ${job.name}`);

    const run = await this.firewallProbeService.runProbe('system:scheduler');
    if (!run) {
      this.logger.warn('Firewall probe skipped: no eligible target machines');
      return;
    }

    const counts = run.results.reduce<Record<string, number>>((acc, result) => {
      acc[result.status] = (acc[result.status] ?? 0) + 1;
      return acc;
    }, {});
    const summary = Object.entries(counts)
      .map(([status, count]) => `${status}=${count}`)
      .join(' ');
    // Loud only for real failures; unreachable machines are the normal state of a laptop between rounds.
    if (counts.fail) {
      this.logger.error(`Firewall probe ${run.runId}: ${counts.fail} machine(s) failed (${summary})`);
    } else {
      this.logger.log(`Firewall probe ${run.runId}: ${summary}`);
    }
  }
}
