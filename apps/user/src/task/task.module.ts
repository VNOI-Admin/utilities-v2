import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { User, UserSchema } from '../database/schema/user.schema';
import { TaskService } from './task.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ScheduleModule.forRoot(),
  ],
  providers: [TaskService],
})
export class TaskModule {}
