import { Contest, ContestSchema } from '@libs/common-db/schemas/contest.schema';
import { Submission, SubmissionSchema } from '@libs/common-db/schemas/submission.schema';
import { Participant, ParticipantSchema } from '@libs/common-db/schemas/participant.schema';
import { Problem, ProblemSchema } from '@libs/common-db/schemas/problem.schema';
import { User, UserSchema } from '@libs/common-db/schemas/user.schema';
import { VNOJApiModule } from '@libs/api/vnoj-api.module';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ContestController } from './contest.controller';
import { ContestService } from './contest.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contest.name, schema: ContestSchema },
      { name: Submission.name, schema: SubmissionSchema },
      { name: Participant.name, schema: ParticipantSchema },
      { name: Problem.name, schema: ProblemSchema },
      { name: User.name, schema: UserSchema },
    ]),
    VNOJApiModule.forRootAsync(),
    UserModule,
  ],
  controllers: [ContestController],
  providers: [ContestService],
})
export class ContestModule {}
