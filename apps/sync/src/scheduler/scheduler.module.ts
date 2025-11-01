import { User, UserSchemaFactory } from '@libs/common-db/schemas/user.schema';
import { Contest, ContestSchema } from '@libs/common-db/schemas/contest.schema';
import { Submission, SubmissionSchema } from '@libs/common-db/schemas/submission.schema';
import { Participant, ParticipantSchema } from '@libs/common-db/schemas/participant.schema';
import { Problem, ProblemSchema } from '@libs/common-db/schemas/problem.schema';
import { VnojApiModule } from '@app/api/vnoj-api.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { QUEUE_NAMES } from './constants';
import { PingUsersProcessor } from './processors/ping-users.processor';
import { SyncSubmissionsProcessor } from './processors/sync-submissions.processor';
import { ProcessReactionsProcessor } from './processors/process-reactions.processor';
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
    BullModule.registerQueue(
      {
        name: QUEUE_NAMES.PING_USERS,
      },
      {
        name: QUEUE_NAMES.SYNC_SUBMISSIONS,
      },
      {
        name: QUEUE_NAMES.PROCESS_REACTIONS,
      },
    ),
    MongooseModule.forFeatureAsync([
      {
        name: User.name,
        inject: [ConfigService],
        useFactory: UserSchemaFactory,
      },
    ]),
    MongooseModule.forFeature([
      { name: Contest.name, schema: ContestSchema },
      { name: Submission.name, schema: SubmissionSchema },
      { name: Participant.name, schema: ParticipantSchema },
      { name: Problem.name, schema: ProblemSchema },
    ]),
    VnojApiModule.forRootAsync(),
  ],
  providers: [SchedulerService, PingUsersProcessor, SyncSubmissionsProcessor, ProcessReactionsProcessor],
})
export class SchedulerModule {}
