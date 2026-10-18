import { VNOJApiModule } from '@libs/api/vnoj-api.module';
import { Contest, ContestSchema } from '@libs/common-db/schemas/contest.schema';
import { Participant, ParticipantSchema } from '@libs/common-db/schemas/participant.schema';
import { Problem, ProblemSchema } from '@libs/common-db/schemas/problem.schema';
import { Submission, SubmissionSchema } from '@libs/common-db/schemas/submission.schema';
import { User, UserSchema } from '@libs/common-db/schemas/user.schema';
import { FirewallProbeCoreModule } from '@libs/common/firewall-probe/firewall-probe.module';
import { RemoteControlCoreModule } from '@libs/common/remote-control/remote-control.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { QUEUE_NAMES } from './constants';
import { FirewallProbeProcessor } from './processors/firewall-probe.processor';
import { PingUsersProcessor } from './processors/ping-users.processor';
import { ProcessReactionsProcessor } from './processors/process-reactions.processor';
import { ReactionRenderProcessor } from './processors/reaction-render.processor';
import { SecurityReportProcessor } from './processors/security-report.processor';
import { SyncSubmissionsProcessor } from './processors/sync-submissions.processor';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [
    RemoteControlCoreModule,
    FirewallProbeCoreModule,
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
      {
        name: QUEUE_NAMES.SECURITY_REPORT,
      },
      {
        name: QUEUE_NAMES.FIREWALL_PROBE,
      },
    ),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Contest.name, schema: ContestSchema },
      { name: Submission.name, schema: SubmissionSchema },
      { name: Participant.name, schema: ParticipantSchema },
      { name: Problem.name, schema: ProblemSchema },
    ]),
    VNOJApiModule.forRootAsync(),
  ],
  providers: [
    SchedulerService,
    PingUsersProcessor,
    SyncSubmissionsProcessor,
    ProcessReactionsProcessor,
    ReactionRenderProcessor,
    SecurityReportProcessor,
    FirewallProbeProcessor,
  ],
})
export class SchedulerModule {}
