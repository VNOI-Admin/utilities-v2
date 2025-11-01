import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessTokenGuard } from './accessToken.guard';
import { IPAddressGuard } from './ipAddress.guard';
import { RefreshTokenGuard } from './refreshToken.guard';
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
    ]),
  ],
  providers: [AccessTokenGuard, IPAddressGuard, RefreshTokenGuard],
  exports: [AccessTokenGuard, IPAddressGuard, RefreshTokenGuard],
})
export class GuardsModule {}
