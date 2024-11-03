import { User, UserSchema } from '@libs/common-db/schemas/user.schema';
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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PrintJob.name, schema: PrintJobSchema },
      { name: PrintClient.name, schema: PrintClientSchema },
    ]),
  ],
  controllers: [PrintingController],
  providers: [PrintingService],
})
export class PrintingModule {}