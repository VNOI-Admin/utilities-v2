import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { Group, GroupSchema } from 'libs/common-db/src/schemas/group.schema';

import { UserModule } from '../user/user.module';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';

@Module({
  imports: [
    forwardRef(() => UserModule),
    HttpModule,
    MongooseModule.forFeature([{ name: Group.name, schema: GroupSchema }]),
  ],
  controllers: [GroupController],
  providers: [GroupService],
  exports: [GroupService, MongooseModule.forFeature([{ name: Group.name, schema: GroupSchema }])],
})
export class GroupModule {}
