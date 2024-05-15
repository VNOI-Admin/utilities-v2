import { buildUserSchema, GroupSchema, User } from '@libs/common-db';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: User.name,
        inject: [ConfigService],
        useFactory: (configService: ConfigService) =>  buildUserSchema(configService),
      },
      {
        name: 'Group',
        useFactory: () => GroupSchema,
      }
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
