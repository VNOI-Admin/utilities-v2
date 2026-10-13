import { MachineAuthModule } from '@libs/common/machine/machine-auth.module';
import { Module } from '@nestjs/common';

import { MachinesController } from './machines.controller';
import { MachinesService } from './machines.service';

@Module({
  imports: [MachineAuthModule],
  controllers: [MachinesController],
  providers: [MachinesService],
})
export class MachinesModule {}
