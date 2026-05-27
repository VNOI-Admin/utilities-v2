import { RemoteControlScript, RemoteControlScriptSchema } from '@libs/common-db/schemas/remoteControlScript.schema';
import { RemoteJob, RemoteJobSchema } from '@libs/common-db/schemas/remoteJob.schema';
import { RemoteJobRun, RemoteJobRunSchema } from '@libs/common-db/schemas/remoteJobRun.schema';
import { User, UserSchema } from '@libs/common-db/schemas/user.schema';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RemoteControlService } from './remote-control.service';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: RemoteControlScript.name, schema: RemoteControlScriptSchema },
      { name: RemoteJob.name, schema: RemoteJobSchema },
      { name: RemoteJobRun.name, schema: RemoteJobRunSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [RemoteControlService],
  exports: [RemoteControlService],
})
export class RemoteControlCoreModule {}
