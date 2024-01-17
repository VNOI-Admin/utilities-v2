import { Module } from '@nestjs/common';
import { VpnService } from './vpn.service';
import { JwtModule } from '@nestjs/jwt';
import { AccessTokenStrategy } from '../auth/strategies/accessToken.strategy';
import { RefreshTokenStrategy } from '../auth/strategies/refreshToken.strategy';
import { VpnController } from './vpn.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../database/schema/user.schema';

@Module({
  imports: [
    JwtModule.register({}),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [VpnService, AccessTokenStrategy, RefreshTokenStrategy],
  controllers: [VpnController],
})
export class VpnModule {}
