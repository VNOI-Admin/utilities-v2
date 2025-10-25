import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';

import { QUEUE_NAMES } from './constants';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.PING_USERS) private pingUsersQueue: Queue,
  ) {}

  async onModuleInit() {
    // Add repeatable job to ping users every 1 minute
    await this.pingUsersQueue.add(
      'ping-all-users',
      {},
      {
        repeat: {
          pattern: '*/1 * * * *', // Every 1 minute
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log('Ping users job scheduled to run every 1 minute');
  }
}
