import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccessTokenGuard } from '../common/guards/accessToken.guard';
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
  })
  @Get('user/config/:username')
  async getWireGuardConfig(
    @Request() req: any,
    @Param('username') username: string,
  ) {
    const callerId = req.user['sub'];
    return await this.vpnService.getWireGuardUserConfig(callerId, username);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Get WireGuard core configuration' })
  @ApiResponse({
    status: 200,
    description: 'WireGuard core configuration',
  })
  @Get('core/config')
  async getCoreConfig(@Request() req: any) {
    const callerId = req.user['sub'];
    return await this.vpnService.getWireGuardCoreConfig(callerId);
  }
}
