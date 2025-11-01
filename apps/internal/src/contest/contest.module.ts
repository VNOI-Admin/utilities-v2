import { Contest, ContestSchema } from '@libs/common-db/schemas/contest.schema';
import { Submission, SubmissionSchema } from '@libs/common-db/schemas/submission.schema';
import { Participant, ParticipantSchema } from '@libs/common-db/schemas/participant.schema';
import { Problem, ProblemSchema } from '@libs/common-db/schemas/problem.schema';
import { User, UserSchemaFactory } from '@libs/common-db/schemas/user.schema';
import { VnojApiModule } from '@app/api/vnoj-api.module';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { ContestController } from './contest.controller';
import { ContestService } from './contest.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contest.name, schema: ContestSchema },
      { name: Submission.name, schema: SubmissionSchema },
      { name: Participant.name, schema: ParticipantSchema },
      { name: Problem.name, schema: ProblemSchema },
    ]),
    MongooseModule.forFeatureAsync([
      {
        name: User.name,
        inject: [ConfigService],
        useFactory: UserSchemaFactory,
      },
    ]),
    VnojApiModule.forRootAsync(),
  ],
  controllers: [ContestController],
  providers: [ContestService],
})
export class ContestModule {}
