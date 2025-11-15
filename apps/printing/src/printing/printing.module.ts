import { User, UserSchema } from '@libs/common-db/schemas/user.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { PrintClient, PrintClientSchema } from '@libs/common-db/schemas/printClient.schema';
import { PrintJob, PrintJobSchema } from '@libs/common-db/schemas/printJob.schema';
import { PrintingController } from './printing.controller';
import { PrintingService } from './printing.service';

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
  exports: [PrintingService],
})
export class PrintingModule {}
