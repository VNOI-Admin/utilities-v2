import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { Model } from 'mongoose';
import * as ping from 'ping';

import { QUEUE_NAMES } from '../constants';
import { Role } from '@libs/common/decorators/role.decorator';

@Processor(QUEUE_NAMES.PING_USERS)
export class PingUsersProcessor extends WorkerHost {
  private readonly logger = new Logger(PingUsersProcessor.name);

  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.id} - ${job.name}`);

    const users = await this.userModel.find({
      role: { $in: [Role.CONTESTANT, Role.GUEST] },
      vpnIpAddress: { $ne: null },
      isActive: true,
    });

    this.logger.log(`Pinging ${users.length} users`);

    const now = new Date();

    const pingResults = await Promise.all(
      users.map(async (user) => {
        const res = await ping.promise.probe(user.vpnIpAddress, {
          timeout: 3,
          min_reply: 3,
        });

        const updateFields: Record<string, any> = {};

        if (res.alive && res.time !== 'unknown') {
          updateFields['machineUsage.ping'] = res.time;
          updateFields['machineUsage.isOnline'] = true;

          if (user.role === Role.GUEST) {
            updateFields['machineUsage.lastReportedAt'] = now;
          }
        } else {
          updateFields['machineUsage.ping'] = 0;
          updateFields['machineUsage.isOnline'] = false;

          // Deactivate guest user if offline for 5 minutes
          if (
            user.role === Role.GUEST &&
            user.machineUsage.lastReportedAt &&
            now.getTime() - user.machineUsage.lastReportedAt.getTime() >= 5 * 60 * 1000
          ) {
            updateFields.isActive = false;
          }
        }

        return {
          updateOne: {
            filter: { _id: user._id },
            update: { $set: updateFields },
          },
        };
      }),
    );

    if (pingResults.length > 0) {
      await this.userModel.bulkWrite(pingResults);
    }

    this.logger.log('Pinging completed');
  }
}
