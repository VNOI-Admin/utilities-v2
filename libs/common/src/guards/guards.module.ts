import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessTokenGuard } from './accessToken.guard';
import { IPAddressGuard } from './ipAddress.guard';
import { RefreshTokenGuard } from './refreshToken.guard';
import { User, UserSchema } from '@libs/common-db/schemas/user.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  providers: [AccessTokenGuard, IPAddressGuard, RefreshTokenGuard],
  exports: [AccessTokenGuard, IPAddressGuard, RefreshTokenGuard],
})
export class GuardsModule {}
