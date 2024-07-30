import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { VpnConfig } from './entities/vpnConfig.entity';
import { VpnService } from './vpn.service';

@ApiTags('VPN')
@Controller('vpn')
export class VpnController {
  constructor(private readonly vpnService: VpnService) {}

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Get WireGuard configuration' })
  @ApiResponse({
    status: 200,
    description: 'WireGuard configuration',
    type: VpnConfig,
  })
  @Get('config')
  async getWireGuardConfig(@Request() req: any) {
    const callerId = req.user['sub'];
    return await this.vpnService.getWireGuardConfig(callerId);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Get WireGuard configuration' })
  @ApiResponse({
    status: 200,
    description: 'WireGuard configuration',
    type: VpnConfig,
  })
  @Get('config/:username')
  async getWireGuardConfigByUsername(
    @Request() req: any,
    @Param('username') username: string,
  ) {
    const callerId = req.user['sub'];
    return await this.vpnService.getWireGuardConfig(callerId, username);
  }
}
