import { HttpModule } from '@nestjs/axios';
import { GuardsModule } from '@libs/common/guards/guards.module';
import { RemoteControlScript, RemoteControlScriptSchema } from '@libs/common-db/schemas/remoteControlScript.schema';
import { RemoteJob, RemoteJobSchema } from '@libs/common-db/schemas/remoteJob.schema';
import { RemoteJobRun, RemoteJobRunSchema } from '@libs/common-db/schemas/remoteJobRun.schema';
import { User, UserSchema } from '@libs/common-db/schemas/user.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RemoteControlAgentController } from './remote-control-agent.controller';
import { RemoteControlAgentClient } from './remote-control-agent-client.service';
import { RemoteControlEventsService } from './remote-control-events.service';
import { RemoteControlJobsController } from './remote-control-jobs.controller';
import { RemoteControlJobsService } from './remote-control-jobs.service';
import { RemoteControlScriptsController } from './remote-control-scripts.controller';
import { RemoteControlScriptsService } from './remote-control-scripts.service';

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
  controllers: [RemoteControlScriptsController, RemoteControlJobsController, RemoteControlAgentController],
  providers: [
    RemoteControlAgentClient,
    RemoteControlEventsService,
    RemoteControlScriptsService,
    RemoteControlJobsService,
  ],
})
export class RemoteControlModule {}
