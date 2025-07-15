import { OverlayLayout, OverlayLayoutSchema } from '@libs/common-db/schemas/overlay.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from '../user/user.module';
import { OverlayController } from './overlay.controller';
import { OverlayService } from './overlay.service';

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeatureAsync([{ name: OverlayLayout.name, useFactory: () => OverlayLayoutSchema }]),
  ],
  controllers: [OverlayController],
  providers: [OverlayService],
})
export class OverlayModule {}
