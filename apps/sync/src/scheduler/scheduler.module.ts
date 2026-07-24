import { VNOJApiModule } from '@libs/api/vnoj-api.module';
import { Contest, ContestSchema } from '@libs/common-db/schemas/contest.schema';
import { Participant, ParticipantSchema } from '@libs/common-db/schemas/participant.schema';
import { Problem, ProblemSchema } from '@libs/common-db/schemas/problem.schema';
import { RemoteControlScript, RemoteControlScriptSchema } from '@libs/common-db/schemas/remoteControlScript.schema';
import { Submission, SubmissionSchema } from '@libs/common-db/schemas/submission.schema';
import { SystemConfig, SystemConfigSchema } from '@libs/common-db/schemas/systemConfig.schema';
import { User, UserSchema } from '@libs/common-db/schemas/user.schema';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { QUEUE_NAMES } from './constants';
import { PingUsersProcessor } from './processors/ping-users.processor';
import { ProcessReactionsProcessor } from './processors/process-reactions.processor';
import { ReactionRenderProcessor } from './processors/reaction-render.processor';
import { SyncSubmissionsProcessor } from './processors/sync-submissions.processor';
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
      {
        name: QUEUE_NAMES.REACTION_RENDER,
      },
    ),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Contest.name, schema: ContestSchema },
      { name: Submission.name, schema: SubmissionSchema },
      { name: Participant.name, schema: ParticipantSchema },
      { name: Problem.name, schema: ProblemSchema },
      { name: RemoteControlScript.name, schema: RemoteControlScriptSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
    ]),
    VNOJApiModule.forRootAsync(),
  ],
  providers: [
    SchedulerService,
    PingUsersProcessor,
    SyncSubmissionsProcessor,
    ProcessReactionsProcessor,
    ReactionRenderProcessor,
  ],
})
export class SchedulerModule {}
