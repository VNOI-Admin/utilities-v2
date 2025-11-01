import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Job } from 'bullmq';
import { Model } from 'mongoose';
import * as ping from 'ping';

import { QUEUE_NAMES } from '../constants';

@Processor(QUEUE_NAMES.PING_USERS)
export class PingUsersProcessor extends WorkerHost {
  private readonly logger = new Logger(PingUsersProcessor.name);

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

    this.logger.log(`Pinging ${users.length} users`);

    await Promise.all(
      users.map(async (user) => {
        const res = await ping.promise.probe(user.vpnIpAddress, {
          timeout: 3,
          min_reply: 3,
        });
        if (res.alive && res.time !== 'unknown') {
          user.machineUsage.ping = res.time;
          user.machineUsage.isOnline = true;
        } else {
          user.machineUsage.ping = 0;
          user.machineUsage.isOnline = false;
        }
        await user.save();
      }),
    );

    this.logger.log('Pinging completed');
  }
}
