import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Group, GroupSchema } from 'libs/common-db/src/schemas/group.schema';

import { GroupController } from './group.controller';
import { GroupService } from './group.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeatureAsync([
      {
        name: Group.name,
        useFactory: () => GroupSchema,
      },
    ]),
  ],
  controllers: [GroupController],
  providers: [GroupService],
  exports: [
    GroupService,
    MongooseModule.forFeatureAsync([
      {
        name: Group.name,
        useFactory: () => GroupSchema,
      },
    ]),
  ],
})
export class GroupModule {}
