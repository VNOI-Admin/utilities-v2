import { Participant, ParticipantSchema } from '@libs/common-db/schemas/participant.schema';
import { Problem, ProblemSchema } from '@libs/common-db/schemas/problem.schema';
import { Submission, SubmissionSchema } from '@libs/common-db/schemas/submission.schema';
import { SystemConfig, SystemConfigSchema } from '@libs/common-db/schemas/systemConfig.schema';
import { User, UserSchema } from '@libs/common-db/schemas/user.schema';
import { REACTION_RENDER_QUEUE } from '@libs/common/queues/reaction-queue';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { ReactionController } from './reaction.controller';
import { ReactionService } from './reaction.service';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST'),
          port: Number(configService.get('REDIS_PORT')),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    // Producer only: the render worker itself lives in the sync app.
    BullModule.registerQueue({ name: REACTION_RENDER_QUEUE }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Submission.name, schema: SubmissionSchema },
      { name: Participant.name, schema: ParticipantSchema },
      { name: Problem.name, schema: ProblemSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
    ]),
  ],
  controllers: [ReactionController],
  providers: [ReactionService],
})
export class ReactionModule {}
