import { GuardsModule } from '@libs/common/guards/guards.module';
import { RemoteControlCoreModule } from '@libs/common/remote-control/remote-control.module';
import { Module } from '@nestjs/common';
import { RemoteControlController } from './remote-control.controller';

@Module({
  imports: [GuardsModule, RemoteControlCoreModule],
  controllers: [RemoteControlController],
  exports: [RemoteControlCoreModule],
})
export class RemoteControlModule {}
