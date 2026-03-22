import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

import { VpnSyncService } from './vpn-sync.service';

const VPN_USER_SYNC_QUEUE = 'vpn-user-sync';

type UserVpnSyncJobData = {
  username: string;
};

@Processor(VPN_USER_SYNC_QUEUE)
export class VpnSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(VpnSyncProcessor.name);

  constructor(private readonly vpnSyncService: VpnSyncService) {
    super();
  }

  async process(job: Job<UserVpnSyncJobData>): Promise<void> {
    this.logger.log(`Processing job ${job.id} - ${job.name} for ${job.data.username}`);

    try {
      await this.vpnSyncService.syncUser(job.data.username);
      this.logger.log(`VPN sync completed for ${job.data.username}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to sync VPN for ${job.data.username}: ${errorMessage}`, errorStack);
      throw error;
    }
  }
}
