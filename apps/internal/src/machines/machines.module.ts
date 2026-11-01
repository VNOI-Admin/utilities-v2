import { SystemConfig, SystemConfigSchema } from '@libs/common-db/schemas/systemConfig.schema';
import { User, UserSchema } from '@libs/common-db/schemas/user.schema';
import { MachineAuthModule } from '@libs/common/machine/machine-auth.module';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { MachinesController } from './machines.controller';
import { MachinesService } from './machines.service';

@Module({
  imports: [
    MachineAuthModule,
    MongooseModule.forFeature([
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [MachinesController],
  providers: [MachinesService],
})
export class MachinesModule {}
