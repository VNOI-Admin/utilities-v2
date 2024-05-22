import { User, UserSchema } from "@libs/common-db/schemas/user.schema";
import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { RefreshTokenStrategy } from "./strategies/refreshToken.strategy";

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  controllers: [AuthController],
  providers: [AuthService, RefreshTokenStrategy],
})
export class AuthModule {}
