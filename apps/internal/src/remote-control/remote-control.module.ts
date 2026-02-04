import { GuardsModule } from '@libs/common/guards/guards.module';
import { RemoteControlScript, RemoteControlScriptSchema } from '@libs/common-db/schemas/remoteControlScript.schema';
import { RemoteJob, RemoteJobSchema } from '@libs/common-db/schemas/remoteJob.schema';
import { RemoteJobRun, RemoteJobRunSchema } from '@libs/common-db/schemas/remoteJobRun.schema';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RemoteControlJobsController } from './remote-control-jobs.controller';
import { RemoteControlJobsService } from './remote-control-jobs.service';
import { RemoteControlScriptsController } from './remote-control-scripts.controller';
import { RemoteControlScriptsService } from './remote-control-scripts.service';

@Module({
  imports: [
    GuardsModule,
    MongooseModule.forFeature([
      { name: RemoteControlScript.name, schema: RemoteControlScriptSchema },
      { name: RemoteJob.name, schema: RemoteJobSchema },
      { name: RemoteJobRun.name, schema: RemoteJobRunSchema },
    ]),
  ],
  controllers: [RemoteControlScriptsController, RemoteControlJobsController],
  providers: [RemoteControlScriptsService, RemoteControlJobsService],
})
export class RemoteControlModule {}
