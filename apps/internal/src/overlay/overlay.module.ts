import { Module } from '@nestjs/common';
import { OverlayController } from './overlay.controller';
import { OverlayService } from './overlay.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '@libs/common-db/schemas/user.schema';
import {
  OverlayLayout,
  OverlayLayoutSchema,
} from '@libs/common-db/schemas/overlay.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: OverlayLayout.name, schema: OverlayLayoutSchema },
    ]),
  ],
  controllers: [OverlayController],
  providers: [OverlayService],
})
export class OverlayModule {}
