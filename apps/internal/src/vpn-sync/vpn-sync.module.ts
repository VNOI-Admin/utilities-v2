import { User, UserSchema } from '@libs/common-db/schemas/user.schema';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { VpnSyncProcessor } from './vpn-sync.processor';
import { VpnSyncService } from './vpn-sync.service';

const VPN_USER_SYNC_QUEUE = 'vpn-user-sync';

@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST'),
          port: Number(configService.get('REDIS_PORT')),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: VPN_USER_SYNC_QUEUE,
    }),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [VpnSyncService, VpnSyncProcessor],
  exports: [VpnSyncService],
})
export class VpnSyncModule {}
