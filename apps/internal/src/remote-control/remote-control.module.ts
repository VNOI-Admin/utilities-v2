import { User, UserSchema } from '@libs/common-db/schemas/user.schema';
import { GuardsModule } from '@libs/common/guards/guards.module';
import { RemoteControlCoreModule } from '@libs/common/remote-control/remote-control.module';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RemoteControlController } from './remote-control.controller';

@Module({
  imports: [
    GuardsModule,
    RemoteControlCoreModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [RemoteControlController],
  exports: [RemoteControlCoreModule],
})
export class RemoteControlModule {}
