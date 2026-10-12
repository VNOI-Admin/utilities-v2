import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';

import { CronExpression } from '@nestjs/schedule';
import { QUEUE_NAMES } from './constants';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.PING_USERS) private pingUsersQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SYNC_SUBMISSIONS) private syncSubmissionsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.PROCESS_REACTIONS) private processReactionsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SECURITY_REPORT) private securityReportQueue: Queue,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Add repeatable job to ping users every 1 minute
    await this.pingUsersQueue.add(
      'ping-all-users',
      {},
      {
        repeat: {
          // every 15 seconds
          pattern: '*/15 * * * * *',
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log('Ping users job scheduled to run every 1 minute');

    // Add repeatable job to sync submissions every 10 seconds
    await this.syncSubmissionsQueue.add(
      'sync-contest-submissions',
      {},
      {
        repeat: {
          every: 10000, // Every 10 seconds
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log('Sync submissions job scheduled to run every 10 seconds');

    // Add repeatable job to process reactions every 5 seconds
    await this.processReactionsQueue.add(
      'process-ac-reactions',
      {},
      {
        repeat: {
          every: 5000, // Every 5 seconds
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log('Process reactions job scheduled to run every 5 seconds');

    // Opt-in: pulls integrity/audit reports from every machine through the remote-control
    // agent channel; unset means reports are only pulled on demand from the admin panel.
    const securityReportCron = this.configService.get<string>('SECURITY_REPORT_CRON');
    if (securityReportCron) {
      await this.securityReportQueue.add(
        'run-security-report',
        {},
        {
          repeat: {
            pattern: securityReportCron,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
      this.logger.log(`Security report job scheduled with cron '${securityReportCron}'`);
    }
  }
}
