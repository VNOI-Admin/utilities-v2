import { AccessTokenOptional } from '@libs/common/decorators/accessTokenOptional.decorator';
import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import { IPAddressGuard } from '@libs/common/guards/ipAddress.guard';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  type MessageEvent,
  Param,
  Patch,
  Post,
  Query,
  Request,
  SerializeOptions,
  Sse,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Observable } from 'rxjs';
import { AgentJobUpdateDto } from './dtos/agentJobUpdate.dto';
import { CancelRemoteControlJobDto } from './dtos/cancelJob.dto';
import { CreateRemoteControlJobDto } from './dtos/createJob.dto';
import { CreateRemoteControlScriptDto } from './dtos/createScript.dto';
import { GetRemoteControlJobRunsDto } from './dtos/getJobRuns.dto';
import { GetRemoteControlJobsDto } from './dtos/getJobs.dto';
import { RefreshRemoteControlJobDto } from './dtos/refreshJob.dto';
import { UpdateRemoteControlScriptDto } from './dtos/updateScript.dto';
import { RemoteControlScriptEntity, RemoteControlScriptSummaryEntity } from './entities/remoteControlScript.entity';
import { RemoteJobEntity } from './entities/remoteJob.entity';
import { RemoteJobCancelResponseEntity } from './entities/remoteJobCancel.entity';
import { RemoteJobRefreshSyncResponseEntity } from './entities/remoteJobRefresh.entity';
import { RemoteJobRunEntity } from './entities/remoteJobRun.entity';
import { RemoteControlService } from './remote-control.service';

@ApiTags('Remote Control')
@Controller('remote-control')
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ excludeExtraneousValues: true })
export class RemoteControlController {
  constructor(private readonly service: RemoteControlService) {}

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'List scripts' })
  @ApiResponse({ status: 200, type: [RemoteControlScriptSummaryEntity] })
  @Get('/scripts')
  async listScripts() {
    const scripts = await this.service.listScripts();
    return scripts.map((s) => new RemoteControlScriptSummaryEntity(s as any));
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Create script' })
  @ApiResponse({ status: 200, type: RemoteControlScriptEntity })
  @Post('/scripts')
  async createScript(@Body() dto: CreateRemoteControlScriptDto) {
    const script = await this.service.createScript(dto.name, dto.content);
    return new RemoteControlScriptEntity(script as any);
  }

  @ApiBearerAuth()
  @AccessTokenOptional()
  @UseGuards(AccessTokenGuard, IPAddressGuard)
  @RequiredRoles(Role.ADMIN, Role.CONTESTANT)
  @ApiOperation({ summary: 'Get script by name' })
  @ApiResponse({ status: 200, type: RemoteControlScriptEntity })
  @Get('/scripts/:name')
  async getScript(@Param('name') name: string) {
    const script = await this.service.getScriptByName(name);
    return new RemoteControlScriptEntity(script as any);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Update script content' })
  @ApiResponse({ status: 200, type: RemoteControlScriptEntity })
  @Patch('/scripts/:name')
  async updateScript(@Param('name') name: string, @Body() dto: UpdateRemoteControlScriptDto) {
    const script = await this.service.updateScriptContent(name, dto.content);
    return new RemoteControlScriptEntity(script as any);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete script' })
  @ApiResponse({
    status: 200,
    schema: { properties: { success: { type: 'boolean' } } },
  })
  @Delete('/scripts/:name')
  deleteScript(@Param('name') name: string) {
    return this.service.deleteScript(name);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Create job' })
  @ApiResponse({ status: 200, type: RemoteJobEntity })
  @Post('/jobs')
  async createJob(@Request() req: any, @Body() dto: CreateRemoteControlJobDto) {
    const job = await this.service.createJob(req.user?.sub, dto);
    return new RemoteJobEntity(job as any);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'List jobs' })
  @ApiResponse({ status: 200, type: [RemoteJobEntity] })
  @Get('/jobs')
  async listJobs(@Query() query: GetRemoteControlJobsDto) {
    const jobs = await this.service.listJobs(query);
    return jobs.map((j) => new RemoteJobEntity(j as any));
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Get job' })
  @ApiResponse({ status: 200, type: RemoteJobEntity })
  @Get('/jobs/:jobId')
  async getJob(@Param('jobId') jobId: string) {
    const job = await this.service.getJob(jobId);
    return new RemoteJobEntity(job as any);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'List runs in a job' })
  @ApiResponse({ status: 200, type: [RemoteJobRunEntity] })
  @Get('/jobs/:jobId/runs')
  async listRuns(@Param('jobId') jobId: string, @Query() query: GetRemoteControlJobRunsDto) {
    const runs = await this.service.listRuns(jobId, query);
    return runs.map((r) => new RemoteJobRunEntity(r as any));
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Get a run' })
  @ApiResponse({ status: 200, type: RemoteJobRunEntity })
  @Get('/jobs/:jobId/runs/:target')
  async getRun(@Param('jobId') jobId: string, @Param('target') target: string) {
    const run = await this.service.getRun(jobId, target);
    return new RemoteJobRunEntity(run as any);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Cancel selected targets in a job' })
  @ApiResponse({ status: 200, type: RemoteJobCancelResponseEntity })
  @Post('/jobs/:jobId/cancel')
  async cancelJob(@Param('jobId') jobId: string, @Body() dto: CancelRemoteControlJobDto) {
    const res = await this.service.cancelJob(jobId, dto);
    return new RemoteJobCancelResponseEntity(res as any);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Request on-demand status/log refresh' })
  @ApiResponse({
    status: 200,
    type: RemoteJobRefreshSyncResponseEntity,
    description: 'Sync mode',
  })
  @ApiResponse({
    status: 200,
    schema: { properties: { accepted: { type: 'boolean' } } },
    description: 'Async mode',
  })
  @Post('/jobs/:jobId/refresh')
  async refreshJob(@Param('jobId') jobId: string, @Body() dto: RefreshRemoteControlJobDto) {
    const res = await this.service.refreshJob(jobId, dto);
    if ('accepted' in res) return res;

    return new RemoteJobRefreshSyncResponseEntity({
      jobId: res.jobId,
      runs: res.runs.map((r) => new RemoteJobRunEntity(r as any)),
    });
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Subscribe to per-job updates' })
  @ApiProduces('text/event-stream')
  @Sse('/jobs/:jobId/events')
  subscribe(@Param('jobId') jobId: string): Observable<MessageEvent> {
    return this.service.subscribe(jobId);
  }

  @UseGuards(IPAddressGuard)
  @RequiredRoles(Role.CONTESTANT)
  @ApiOperation({ summary: 'Post job updates (status/log)' })
  @ApiResponse({
    status: 200,
    schema: { properties: { success: { type: 'boolean' } } },
  })
  @Post('/agent/jobs/:jobId/updates')
  async agentUpdate(@Request() req: any, @Param('jobId') jobId: string, @Body() dto: AgentJobUpdateDto) {
    await this.service.applyAgentUpdate(jobId, req.user, dto);
    return { success: true };
  }
}
