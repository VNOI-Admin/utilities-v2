import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import { Body, ClassSerializerInterceptor, Controller, Get, Param, Post, Query, Request, SerializeOptions, Sse, UseGuards, UseInterceptors, type MessageEvent } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Observable } from 'rxjs';
import { CancelRemoteControlJobDto } from './dtos/cancelJob.dto';
import { CreateRemoteControlJobDto } from './dtos/createJob.dto';
import { GetRemoteControlJobsDto } from './dtos/getJobs.dto';
import { GetRemoteControlJobRunsDto } from './dtos/getJobRuns.dto';
import { RefreshRemoteControlJobDto } from './dtos/refreshJob.dto';
import { RemoteJobEntity } from './entities/remoteJob.entity';
import { RemoteJobCancelResponseEntity } from './entities/remoteJobCancel.entity';
import { RemoteJobRefreshSyncResponseEntity } from './entities/remoteJobRefresh.entity';
import { RemoteJobRunEntity } from './entities/remoteJobRun.entity';
import { RemoteControlJobsService } from './remote-control-jobs.service';
import { RemoteControlEventsService } from './remote-control-events.service';

@ApiTags('Remote Control')
@Controller('remote-control/jobs')
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ excludeExtraneousValues: true })
export class RemoteControlJobsController {
  constructor(
    private readonly remoteControlJobsService: RemoteControlJobsService,
    private readonly remoteControlEventsService: RemoteControlEventsService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Create job (fan-out run)' })
  @ApiResponse({
    status: 200,
    description: 'Return job',
    type: RemoteJobEntity,
  })
  @Post('/')
  async createJob(@Request() req: any, @Body() dto: CreateRemoteControlJobDto): Promise<RemoteJobEntity> {
    const createdBy = req.user?.sub;
    const job = await this.remoteControlJobsService.createJob(createdBy, dto);
    return new RemoteJobEntity(job as any);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'List jobs' })
  @ApiResponse({
    status: 200,
    description: 'Return jobs',
    type: [RemoteJobEntity],
  })
  @Get('/')
  async listJobs(@Query() query: GetRemoteControlJobsDto): Promise<RemoteJobEntity[]> {
    const jobs = await this.remoteControlJobsService.listJobs(query);
    return jobs.map((job) => new RemoteJobEntity(job as any));
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Get job' })
  @ApiResponse({
    status: 200,
    description: 'Return job',
    type: RemoteJobEntity,
  })
  @Get('/:jobId')
  async getJob(@Param('jobId') jobId: string): Promise<RemoteJobEntity> {
    const job = await this.remoteControlJobsService.getJob(jobId);
    return new RemoteJobEntity(job as any);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'List runs in a job' })
  @ApiResponse({
    status: 200,
    description: 'Return job runs',
    type: [RemoteJobRunEntity],
  })
  @Get('/:jobId/runs')
  async listRuns(@Param('jobId') jobId: string, @Query() query: GetRemoteControlJobRunsDto): Promise<RemoteJobRunEntity[]> {
    const runs = await this.remoteControlJobsService.listRuns(jobId, query);
    return runs.map((run) => new RemoteJobRunEntity(run as any));
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Get a run' })
  @ApiResponse({
    status: 200,
    description: 'Return job run',
    type: RemoteJobRunEntity,
  })
  @Get('/:jobId/runs/:target')
  async getRun(@Param('jobId') jobId: string, @Param('target') target: string): Promise<RemoteJobRunEntity> {
    const run = await this.remoteControlJobsService.getRun(jobId, target);
    return new RemoteJobRunEntity(run as any);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Cancel selected targets in a job' })
  @ApiResponse({
    status: 200,
    description: 'Cancel results',
    type: RemoteJobCancelResponseEntity,
  })
  @Post('/:jobId/cancel')
  async cancelJob(@Param('jobId') jobId: string, @Body() dto: CancelRemoteControlJobDto): Promise<RemoteJobCancelResponseEntity> {
    const res = await this.remoteControlJobsService.cancelJob(jobId, dto);
    return new RemoteJobCancelResponseEntity(res as any);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Request on-demand status/log refresh' })
  @ApiResponse({
    status: 200,
    description: 'Refresh result (sync mode)',
    type: RemoteJobRefreshSyncResponseEntity,
  })
  @ApiResponse({
    status: 200,
    description: 'Refresh accepted (async mode)',
    schema: {
      properties: { accepted: { type: 'boolean' } },
    },
  })
  @Post('/:jobId/refresh')
  async refreshJob(@Param('jobId') jobId: string, @Body() dto: RefreshRemoteControlJobDto) {
    const res = await this.remoteControlJobsService.refreshJob(jobId, dto);
    if ('accepted' in res) {
      return res;
    }
    return new RemoteJobRefreshSyncResponseEntity({
      jobId: res.jobId,
      runs: res.runs.map((run) => new RemoteJobRunEntity(run as any)),
    });
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Subscribe to per-job updates' })
  @ApiProduces('text/event-stream')
  @Sse('/:jobId/events')
  sse(@Param('jobId') jobId: string): Observable<MessageEvent> {
    return this.remoteControlEventsService.subscribe(jobId);
  }
}
