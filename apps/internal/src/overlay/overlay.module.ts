import { Module } from '@nestjs/common';
import { OverlayController } from './overlay.controller';
import { OverlayService } from './overlay.service';
import { MongooseModule } from '@nestjs/mongoose';
import {
  OverlayLayout,
  OverlayLayoutSchema,
} from '@libs/common-db/schemas/overlay.schema';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeatureAsync([
      { name: OverlayLayout.name, useFactory: () => OverlayLayoutSchema },
    ]),
  ],
  controllers: [OverlayController],
  providers: [OverlayService],
})
export class OverlayModule {}
