import { User, UserSchemaFactory } from '@libs/common-db/schemas/user.schema';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';

import { VpnController } from './vpn.controller';
import { VpnService } from './vpn.service';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    JwtModule.register({}),
    MongooseModule.forFeatureAsync([
      {
        name: User.name,
        inject: [ConfigService],
        useFactory: UserSchemaFactory,
      },
    ]),
  ],
  providers: [VpnService],
  controllers: [VpnController],
})
export class VpnModule {}
