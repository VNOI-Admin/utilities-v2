import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { OverlayModule } from './overlay/overlay.module';
import { DatabaseModule } from '@libs/common-db/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    OverlayModule,
    DatabaseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
