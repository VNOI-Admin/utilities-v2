import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { PrintClient, PrintClientSchema } from '@libs/common-db/schemas/printClient.schema';
import { PrintingModule } from '../printing/printing.module';
import { TaskService } from './task.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PrintClient.name, schema: PrintClientSchema }]),
    ScheduleModule.forRoot(),
    PrintingModule,
  ],
  providers: [TaskService],
})
export class TaskModule {}
