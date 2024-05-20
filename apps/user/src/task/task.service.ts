import { User, type UserDocument } from "@libs/common-db/schemas/user.schema";
import type { OnModuleInit } from "@nestjs/common";
import { Logger } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { CronExpression, SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";
import { Model } from "mongoose";
import * as ping from "ping";

@Injectable()
export class TaskService implements OnModuleInit {
  private readonly logger = new Logger(TaskService.name);
  constructor(
    private schedulerRegistry: SchedulerRegistry,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async onModuleInit() {
    const users = await this.userModel.find({
      role: "user",
      vpnIpAddress: { $ne: null },
      isActive: true,
    });
    this.logger.debug(`Initializing ${users.length} cron jobs for users`);

    for (const user of users) {
      const job = new CronJob(CronExpression.EVERY_5_SECONDS, async () => {
        const res = await ping.promise.probe(user.vpnIpAddress, {
          timeout: 3,
        });
        if (res.alive && res.time != "unknown") {
          user.machineUsage.ping = res.time;
          user.machineUsage.isOnline = true;
        } else {
          user.machineUsage.ping = 0;
          user.machineUsage.isOnline = false;
        }
        await user.save();
      });
      this.schedulerRegistry.addCronJob(`${user._id}-ping`, job);
      job.start();
    }
  }
}
