import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';

import { QUEUE_NAMES } from './constants';
import { CronExpression } from '@nestjs/schedule';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.PING_USERS) private pingUsersQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SYNC_SUBMISSIONS) private syncSubmissionsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.PROCESS_REACTIONS) private processReactionsQueue: Queue,
  ) {}

  async onModuleInit() {
    // Add repeatable job to ping users every 1 minute
    await this.pingUsersQueue.add(
      'ping-all-users',
      {},
      {
        repeat: {
          // every 20 seconds
          pattern: '*/20 * * * * *',
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
  }
}
