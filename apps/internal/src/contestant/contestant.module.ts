import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Contestant,
  ContestantSchema,
} from '@libs/common-db/schemas/contestant.schema';
import { ContestantController } from './contestant.controller';
import { ContestantService } from './contestant.service';
import { User, UserSchema } from '@libs/common-db/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Contestant.name, schema: ContestantSchema },
    ]),
  ],
  controllers: [ContestantController],
  providers: [ContestantService],
  exports: [ContestantService],
})
export class ContestantModule {}
