import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Group, GroupSchema } from "libs/common-db/src/schemas/group.schema";

import { GroupController } from "./group.controller";
import { GroupService } from "./group.service";
import { User, UserSchema } from "@libs/common-db/schemas/user.schema";

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: User.name,
        useFactory: () => UserSchema,
      },
      {
        name: Group.name,
        useFactory: () => GroupSchema,
      },
    ]),
  ],
  controllers: [GroupController],
  providers: [GroupService],
  exports: [GroupService],
})
export class GroupModule {}
