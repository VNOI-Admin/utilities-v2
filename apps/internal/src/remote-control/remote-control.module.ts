import { RemoteControlScript, RemoteControlScriptSchema } from '@libs/common-db/schemas/remoteControlScript.schema';
import { RemoteJob, RemoteJobSchema } from '@libs/common-db/schemas/remoteJob.schema';
import { RemoteJobRun, RemoteJobRunSchema } from '@libs/common-db/schemas/remoteJobRun.schema';
import { User, UserSchema } from '@libs/common-db/schemas/user.schema';
import { GuardsModule } from '@libs/common/guards/guards.module';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RemoteControlController } from './remote-control.controller';
import { RemoteControlService } from './remote-control.service';

@Module({
  imports: [
    GuardsModule,
    HttpModule,
    MongooseModule.forFeature([
      { name: RemoteControlScript.name, schema: RemoteControlScriptSchema },
      { name: RemoteJob.name, schema: RemoteJobSchema },
      { name: RemoteJobRun.name, schema: RemoteJobRunSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [RemoteControlController],
  providers: [RemoteControlService],
})
export class RemoteControlModule {}
