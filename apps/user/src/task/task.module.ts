import { User, UserSchema } from '@libs/common-db/user.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { TaskService } from './task.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ScheduleModule.forRoot(),
  ],
  providers: [TaskService],
})
export class TaskModule {}
