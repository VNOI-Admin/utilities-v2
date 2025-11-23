import { DatabaseModule } from '@libs/common-db/database.module';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserModule } from '../user/user.module';
import { GuestController } from './guest.controller';
import { GuestService } from './guest.service';
import { GuestProcessor } from './guest.processor';

const GUEST_QUEUE = 'guest-operations';

@Module({
  imports: [
    DatabaseModule,
    UserModule,
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
      name: GUEST_QUEUE,
    }),
  ],
  controllers: [GuestController],
  providers: [GuestService, GuestProcessor],
  exports: [GuestService],
})
export class GuestModule {}
