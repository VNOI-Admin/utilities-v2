import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { IPAddressGuard } from '@libs/common/guards/ipAddress.guard';
import { Body, Controller, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AgentJobUpdateDto } from './dtos/agentJobUpdate.dto';
import { RemoteControlJobsService } from './remote-control-jobs.service';

@ApiTags('Remote Control')
@Controller('remote-control/agent')
export class RemoteControlAgentController {
  constructor(private readonly remoteControlJobsService: RemoteControlJobsService) {}

  @UseGuards(IPAddressGuard)
  @RequiredRoles(Role.CONTESTANT)
  @ApiOperation({ summary: 'Post job updates (status/log)' })
  @ApiResponse({
    status: 200,
    schema: { properties: { success: { type: 'boolean' } } },
  })
  @Post('/jobs/:jobId/updates')
  async postJobUpdate(@Request() req: any, @Param('jobId') jobId: string, @Body() dto: AgentJobUpdateDto) {
    const target = req.user;
    await this.remoteControlJobsService.applyAgentUpdate(jobId, target, dto);
    return { success: true };
  }
}

