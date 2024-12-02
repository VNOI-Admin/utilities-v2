import { User, UserSchemaFactory } from '@libs/common-db/schemas/user.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { PrintingController } from './printing.controller';
import { PrintingService } from './printing.service';
import {
  PrintJob,
  PrintJobSchema,
} from '@libs/common-db/schemas/printJob.schema';
import {
  PrintClient,
  PrintClientSchema,
} from '@libs/common-db/schemas/printClient.schema';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: User.name,
        inject: [ConfigService],
        useFactory: UserSchemaFactory,
      },
      { name: PrintJob.name, useFactory: () => PrintJobSchema },
      { name: PrintClient.name, useFactory: () => PrintClientSchema },
    ]),
  ],
  controllers: [PrintingController],
  providers: [PrintingService],
  exports: [PrintingService],
})
export class PrintingModule {}
