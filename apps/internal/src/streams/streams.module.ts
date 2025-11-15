import { Module } from '@nestjs/common';
import { StreamsController } from './streams.controller';
import { StreamsService } from './streams.service';
import { ContestantModule } from '../contestant/contestant.module';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '@libs/common-db/schemas/user.schema';

@Module({
  imports: [
    ContestantModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [StreamsController],
  providers: [StreamsService],
})
export class StreamsModule {}
