import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Group, GroupSchema } from 'libs/common-db/src/schemas/group.schema';

import { UserModule } from '../user/user.module';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';

@Module({
  imports: [UserModule, MongooseModule.forFeature([{ name: Group.name, schema: GroupSchema }])],
  controllers: [GroupController],
  providers: [GroupService],
  exports: [GroupService, MongooseModule.forFeature([{ name: Group.name, schema: GroupSchema }])],
})
export class GroupModule {}
