import { Contest, ContestSchema } from '@libs/common-db/schemas/contest.schema';
import { Group, GroupSchema } from '@libs/common-db/schemas/group.schema';
import { Participant, ParticipantSchema } from '@libs/common-db/schemas/participant.schema';
import { Problem, ProblemSchema } from '@libs/common-db/schemas/problem.schema';
import { Submission, SubmissionSchema } from '@libs/common-db/schemas/submission.schema';
import { User, UserSchema } from '@libs/common-db/schemas/user.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ClicsController } from './clics.controller';
import { ClicsService } from './clics.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Contest.name, schema: ContestSchema },
      { name: Problem.name, schema: ProblemSchema },
      { name: Participant.name, schema: ParticipantSchema },
      { name: Submission.name, schema: SubmissionSchema },
      { name: User.name, schema: UserSchema },
      { name: Group.name, schema: GroupSchema },
    ]),
  ],
  controllers: [ClicsController],
  providers: [ClicsService],
})
export class ClicsModule {}
