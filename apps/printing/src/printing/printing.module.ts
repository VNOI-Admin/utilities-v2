import { User, UserSchema } from "@libs/common-db/schemas/user.schema";
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { PrintingController } from "./printing.controller";
import { PrintingService } from "./printing.service";

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  controllers: [PrintingController],
  providers: [PrintingService],
})
export class PrintingModule {}
