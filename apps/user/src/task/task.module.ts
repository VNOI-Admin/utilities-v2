import { User, UserSchemaFactory } from '@libs/common-db/schemas/user.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { TaskService } from './task.service';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: User.name,
        inject: [ConfigService],
        useFactory: UserSchemaFactory,
      },
    ]),
    ScheduleModule.forRoot(),
  ],
  providers: [TaskService],
})
export class TaskModule {}
