import { Module } from '@nestjs/common';
import { OverlayController } from './overlay.controller';
import { OverlayService } from './overlay.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchemaFactory } from '@libs/common-db/schemas/user.schema';
import {
  OverlayLayout,
  OverlayLayoutSchema,
} from '@libs/common-db/schemas/overlay.schema';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeatureAsync([
      {
        name: User.name,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: UserSchemaFactory,
      },
      { name: OverlayLayout.name, useFactory: () => OverlayLayoutSchema },
    ]),
  ],
  controllers: [OverlayController],
  providers: [OverlayService],
})
export class OverlayModule {}
