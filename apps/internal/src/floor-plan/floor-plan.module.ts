import { FloorPlan, FloorPlanSchema } from '@libs/common-db/schemas/floorPlan.schema';
import { User, UserSchema } from '@libs/common-db/schemas/user.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FloorPlanController } from './floor-plan.controller';
import { FloorPlanService } from './floor-plan.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FloorPlan.name, schema: FloorPlanSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [FloorPlanController],
  providers: [FloorPlanService],
  exports: [FloorPlanService],
})
export class FloorPlanModule {}
