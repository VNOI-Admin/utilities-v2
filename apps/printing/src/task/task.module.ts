import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { TaskService } from './task.service';
import {
  PrintClient,
  PrintClientSchema,
} from '@libs/common-db/schemas/printClient.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PrintClient.name, schema: PrintClientSchema },
    ]),
    ScheduleModule.forRoot(),
  ],
  providers: [TaskService],
})
export class TaskModule {}
