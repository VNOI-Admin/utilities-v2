import { BullModule } from '@nestjs/bullmq';
import { Injectable, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { setUserVpnSyncQueue } from '@libs/common-db/schemas/user.schema';
import { Queue } from 'bullmq';

// Must match apps/internal/src/vpn-sync (queue name, job name, job payload):
// the internal app runs the processor; this module only registers the
// producer so user-app writes (the guest claim's isActive:true transition)
// reach wg-portal instead of hitting the schema hook's no-op default.
const VPN_USER_SYNC_QUEUE = 'vpn-user-sync';
const VPN_USER_SYNC_JOB_NAME = 'sync-user-vpn';

@Injectable()
export class VpnSyncProducerRegistrar {
  constructor(@InjectQueue(VPN_USER_SYNC_QUEUE) queue: Queue) {
    setUserVpnSyncQueue(async (usernames) => {
      const unique = [...new Set(usernames.filter(Boolean))];
      await Promise.all(
        unique.map((username) =>
          queue.add(
            VPN_USER_SYNC_JOB_NAME,
            { username },
            { removeOnComplete: true, removeOnFail: false },
          ),
        ),
      );
    });
  }
}

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
    BullModule.registerQueue({ name: VPN_USER_SYNC_QUEUE }),
  ],
  providers: [VpnSyncProducerRegistrar],
})
export class VpnSyncProducerModule {}
