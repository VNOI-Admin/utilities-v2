import { User, type UserDocument, type MachineUsage } from '@libs/common-db/schemas/user.schema';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { Job } from 'bullmq';
import { Model } from 'mongoose';

import { QUEUE_NAMES } from '../constants';

@Processor(QUEUE_NAMES.SYNC_MACHINE_USAGE)
export class SyncMachineUsageProcessor extends WorkerHost {
  private readonly logger = new Logger(SyncMachineUsageProcessor.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.id} - ${job.name}`);

    const users = await this.userModel.find({
      role: 'contestant',
      vpnIpAddress: { $ne: null },
      isActive: true,
    });

    this.logger.log(`Syncing machine usage for ${users.length} users`);

    await Promise.all(
      users.map(async (user) => {
        const url = `http://${user.vpnIpAddress}:9100`;

        try {
          const response = await axios.get<MachineUsage>(url, {
            timeout: 5000, // 5 second timeout
            headers: {
              'Accept': 'application/json',
            },
          });

          const data = response.data;
          user.machineUsage.isOnline = true;
          user.machineUsage.ping += 1;

          user.machineUsage.cpu = data.cpu;
          user.machineUsage.memory = data.memory;
          user.machineUsage.disk = data.disk;
          user.machineUsage.lastReportedAt = new Date(data.lastReportedAt);
          
          await user.save();
          this.logger.debug(`Updated machine usage for user ${user.username}`);
        } catch (error) {
          this.logger.warn(
            `Failed to fetch machine usage for user ${user.username} (${user.vpnIpAddress}): ${error instanceof Error ? error.message : String(error)}`,
          );
          // Mark as offline if request fails
          user.machineUsage.isOnline = false;
          await user.save();
        }
      }),
    );

    this.logger.log('Machine usage sync completed');
  }
}

