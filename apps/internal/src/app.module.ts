import { DatabaseModule } from '@libs/common-db/database.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GroupModule } from './group/group.module';
import { OverlayModule } from './overlay/overlay.module';
import { ScrapingModule } from './scraping/scraping.module';
import { UserModule } from './user/user.module';
import { ContestModule } from './contest/contest.module';
import { GuardsModule } from '@libs/common/guards/guards.module';
import { PrintingModule } from './printing/printing.module';
import { GuestModule } from './guest/guest.module';
import { FloorPlanModule } from './floor-plan/floor-plan.module';
import { RemoteControlModule } from './remote-control/remote-control.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({ global: true }),
    DatabaseModule,
    UserModule,
    GroupModule,
    GuestModule,
    OverlayModule,
    ScrapingModule,
    GuardsModule,
    ContestModule,
    PrintingModule,
    FloorPlanModule,
    RemoteControlModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
