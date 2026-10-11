import { DatabaseModule } from '@libs/common-db/database.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VpnModule } from './vpn/vpn.module';
import { VpnSyncProducerModule } from './vpn/vpn-sync-producer.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.register({ global: true }),
    DatabaseModule,
    VpnModule,
    VpnSyncProducerModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
