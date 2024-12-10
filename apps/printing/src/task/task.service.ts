import { PrintClient, PrintClientDocument } from '@libs/common-db/schemas/printClient.schema';
import type { OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { Model } from 'mongoose';
import { PrintingService } from '../printing/printing.service';

@Injectable()
export class TaskService implements OnModuleInit {
  constructor(
    private schedulerRegistry: SchedulerRegistry,
    @InjectModel(PrintClient.name)
    private printClientModel: Model<PrintClientDocument>,
    private printingService: PrintingService,
  ) {}

  async onModuleInit() {
    const checkClientOnlineStatus = new CronJob(CronExpression.EVERY_10_SECONDS, async () => {
      const clients = await this.printClientModel.find();
      for (const client of clients) {
        let isOnline = false;
        if (client.lastReportedAt) {
          const diff = new Date().getTime() - client.lastReportedAt.getTime();
          isOnline = diff < 30 * 1000;
        }

        await this.printingService.updatePrintClientStatus(client.clientId, isOnline);

        await this.printingService.rearrangeFloatingPrintJobs();
      }
    });

    this.schedulerRegistry.addCronJob('printClientOnlineUpdate', checkClientOnlineStatus);
    checkClientOnlineStatus.start();
  }
}
