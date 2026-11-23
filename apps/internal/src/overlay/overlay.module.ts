import { OverlayLayout, OverlayLayoutSchema } from '@libs/common-db/schemas/overlay.schema';
import { Submission, SubmissionSchema } from '@libs/common-db/schemas/submission.schema';
import { Participant, ParticipantSchema } from '@libs/common-db/schemas/participant.schema';
import { Problem, ProblemSchema } from '@libs/common-db/schemas/problem.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from '../user/user.module';
import { OverlayController } from './overlay.controller';
import { OverlayService } from './overlay.service';

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([
      { name: OverlayLayout.name, schema: OverlayLayoutSchema },
      { name: Submission.name, schema: SubmissionSchema },
      { name: Participant.name, schema: ParticipantSchema },
      { name: Problem.name, schema: ProblemSchema },
    ]),
  ],
  controllers: [OverlayController],
  providers: [OverlayService],
})
export class OverlayModule {}
