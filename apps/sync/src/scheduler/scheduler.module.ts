import { User, UserSchemaFactory } from '@libs/common-db/schemas/user.schema';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { QUEUE_NAMES } from './constants';
import { PingUsersProcessor } from './processors/ping-users.processor';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: QUEUE_NAMES.PING_USERS,
    }),
    MongooseModule.forFeatureAsync([
      {
        name: User.name,
        inject: [ConfigService],
        useFactory: UserSchemaFactory,
      },
    ]),
  ],
  providers: [SchedulerService, PingUsersProcessor],
})
export class SchedulerModule {}
