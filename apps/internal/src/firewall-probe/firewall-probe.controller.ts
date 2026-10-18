import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { FirewallProbeService } from '@libs/common/firewall-probe/firewall-probe.service';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Post,
  Query,
  Request,
  SerializeOptions,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetFirewallProbeResultsDto, RunFirewallProbeDto } from './dtos/firewallProbe.dto';
import { FirewallProbeResultEntity } from './entities/firewallProbe.entity';

const DEFAULT_HISTORY_LIMIT = 20;

@ApiTags('Firewall Probe')
@Controller('firewall-probe')
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ excludeExtraneousValues: true })
export class FirewallProbeController {
  constructor(private readonly service: FirewallProbeService) {}

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({
    summary: 'Probe machine firewalls from central, out of band',
    description:
      'Connects to each machine over the tunnel: one port the ruleset must accept (liveness anchor) and ' +
      'several it must drop, correlated with the WireGuard handshake the server observed. Nothing on the ' +
      'machine is asked for its opinion. Takes a few seconds per batch of 16 machines.',
  })
  @ApiResponse({ status: 200, type: [FirewallProbeResultEntity], description: 'Per-machine verdicts' })
  @Post()
  async runProbe(@Request() req: any, @Body() dto: RunFirewallProbeDto) {
    const run = await this.service.runProbe(req.user?.sub ?? 'admin', dto.targets);
    if (!run) return { started: false, reason: 'No eligible target machines' };
    return {
      runId: run.runId,
      results: run.results.map((result) => new FirewallProbeResultEntity(result)),
    };
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Stored firewall probe verdicts: latest per machine, or one machine history' })
  @ApiResponse({ status: 200, type: [FirewallProbeResultEntity] })
  @Get('/results')
  async getResults(@Query() dto: GetFirewallProbeResultsDto) {
    const results = dto.target
      ? await this.service.getResultsForTarget(dto.target, dto.limit ?? DEFAULT_HISTORY_LIMIT)
      : await this.service.getLatestResults();
    return results.map((result) => new FirewallProbeResultEntity(result));
  }
}
