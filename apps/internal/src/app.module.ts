import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { OverlayModule } from './overlay/overlay.module';
import { DatabaseModule } from '@libs/common-db/database.module';
import { GroupModule } from './group/group.module';
import { UserModule } from './user/user.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({ global: true }),
    DatabaseModule,
    UserModule,
    GroupModule,
    OverlayModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
