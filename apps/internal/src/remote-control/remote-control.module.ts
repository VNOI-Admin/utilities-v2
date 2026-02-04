import { GuardsModule } from '@libs/common/guards/guards.module';
import { RemoteControlScript, RemoteControlScriptSchema } from '@libs/common-db/schemas/remoteControlScript.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RemoteControlScriptsController } from './remote-control-scripts.controller';
import { RemoteControlScriptsService } from './remote-control-scripts.service';

@Module({
  imports: [GuardsModule, MongooseModule.forFeature([{ name: RemoteControlScript.name, schema: RemoteControlScriptSchema }])],
  controllers: [RemoteControlScriptsController],
  providers: [RemoteControlScriptsService],
})
export class RemoteControlModule {}

