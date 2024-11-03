import {
  PrintClient,
  PrintClientDocument,
} from '@libs/common-db/schemas/printClient.schema';
import type { OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { Model } from 'mongoose';

@Injectable()
export class TaskService implements OnModuleInit {
  constructor(
    private schedulerRegistry: SchedulerRegistry,
    @InjectModel(PrintClient.name)
    private printClientModel: Model<PrintClientDocument>,
  ) {}

  async onModuleInit() {
    const job = new CronJob(CronExpression.EVERY_MINUTE, async () => {
      const clients = await this.printClientModel.find();
      for (const client of clients) {
        let newIsOnline = false;
        if (client.lastReportedAt) {
          const diff = new Date().getTime() - client.lastReportedAt.getTime();
          newIsOnline = diff < 60 * 1000;
        }

        if (client.isOnline !== newIsOnline) {
          client.isOnline = newIsOnline;
          client.save();
        }
      }
    });
    this.schedulerRegistry.addCronJob(`printClientOnlineUpdate`, job);
    job.start();
  }
}
