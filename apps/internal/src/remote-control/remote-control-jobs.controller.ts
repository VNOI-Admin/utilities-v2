import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import { Body, ClassSerializerInterceptor, Controller, Get, Param, Post, Query, Request, SerializeOptions, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateRemoteControlJobDto } from './dtos/createJob.dto';
import { GetRemoteControlJobsDto } from './dtos/getJobs.dto';
import { GetRemoteControlJobRunsDto } from './dtos/getJobRuns.dto';
import { RemoteJobEntity } from './entities/remoteJob.entity';
import { RemoteJobRunEntity } from './entities/remoteJobRun.entity';
import { RemoteControlJobsService } from './remote-control-jobs.service';

@ApiTags('Remote Control')
@Controller('remote-control/jobs')
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ excludeExtraneousValues: true })
export class RemoteControlJobsController {
  constructor(private readonly remoteControlJobsService: RemoteControlJobsService) {}

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
}

