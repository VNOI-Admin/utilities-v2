import { User, type UserDocument } from '@libs/common-db/schemas/user.schema';
import { Role } from '@libs/common/decorators/role.decorator';
import type { OnModuleInit } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { Model } from 'mongoose';
import * as ping from 'ping';

@Injectable()
export class TaskService implements OnModuleInit {
  private readonly logger = new Logger(TaskService.name);
  constructor(
    private schedulerRegistry: SchedulerRegistry,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async onModuleInit() {
    // make this cron fetch the users by every minute, then after that check their ping
    const job = new CronJob(CronExpression.EVERY_30_SECONDS, async () => {
      const users = await this.userModel.find({
        role: { $in: [Role.CONTESTANT, Role.GUEST] },
        vpnIpAddress: { $ne: null },
        isActive: true,
      });

      this.logger.log(`Pinging ${users.length} users`);

      const now = new Date();

      await Promise.all(
        users.map(async (user) => {
          const res = await ping.promise.probe(user.vpnIpAddress, {
            timeout: 3,
            min_reply: 3,
          });
          if (res.alive && res.time !== 'unknown') {
            user.machineUsage.ping = res.time;
            user.machineUsage.isOnline = true;

            if (user.role === Role.GUEST)
              user.machineUsage.lastReportedAt = now;
          } else {
            user.machineUsage.ping = 0;
            user.machineUsage.isOnline = false;

            // Deactivate guest user if offline for 30 minutes
            if (
              user.role === Role.GUEST &&
              user.machineUsage.lastReportedAt &&
              now.getTime() - user.machineUsage.lastReportedAt.getTime() >=
                30 * 60 * 1000
            ) {
              user.isActive = false;
            }
          }
          await user.save();
        }),
      );

      this.logger.log('Pinging completed');
    });

    this.schedulerRegistry.addCronJob('ping-all-users', job);
    job.start();
  }
}
