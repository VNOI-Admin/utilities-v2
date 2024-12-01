import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Group, GroupSchema } from 'libs/common-db/src/schemas/group.schema';

import { GroupController } from './group.controller';
import { GroupService } from './group.service';
import { User, UserSchemaFactory } from '@libs/common-db/schemas/user.schema';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: User.name,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: UserSchemaFactory,
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
