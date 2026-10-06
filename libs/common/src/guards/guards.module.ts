import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessTokenGuard } from './accessToken.guard';
import { IPAddressGuard } from './ipAddress.guard';
import { RefreshTokenGuard } from './refreshToken.guard';
import { User, UserSchema } from '@libs/common-db/schemas/user.schema';

const userModel = MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]);

// Nest instantiates @UseGuards() guards in the controller's own module, so importers need the User model too.
@Module({
  imports: [userModel],
  providers: [AccessTokenGuard, IPAddressGuard, RefreshTokenGuard],
  exports: [userModel, AccessTokenGuard, IPAddressGuard, RefreshTokenGuard],
})
export class GuardsModule {}
