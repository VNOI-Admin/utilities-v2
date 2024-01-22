import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';

import { AccessTokenStrategy } from '../auth/strategies/accessToken.strategy';
import { RefreshTokenStrategy } from '../auth/strategies/refreshToken.strategy';
import { User, UserSchema } from '../database/schema/user.schema';
import { VpnController } from './vpn.controller';
import { VpnService } from './vpn.service';

@Module({
  imports: [
    JwtModule.register({}),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [VpnService, AccessTokenStrategy, RefreshTokenStrategy],
  controllers: [VpnController],
})
export class VpnModule {}
