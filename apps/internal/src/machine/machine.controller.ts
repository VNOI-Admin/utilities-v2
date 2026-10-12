import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Post,
  type RawBodyRequest,
  Request,
  SerializeOptions,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { SubmitLuksRecoveryDto } from './dtos/submitLuksRecovery.dto';
import { LuksRecoveryEntity } from './entities/luksRecovery.entity';
import { LuksRecoverySummaryEntity } from './entities/luksRecoverySummary.entity';
import { LuksEscrowService } from './luks-escrow.service';
import { MachineHmacGuard } from './machine-auth.guard';

@ApiTags('Machine')
@Controller('machine')
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ excludeExtraneousValues: true })
export class MachineController {
  constructor(private readonly luksEscrowService: LuksEscrowService) {}

  @UseGuards(MachineHmacGuard)
  @ApiOperation({
    summary: 'Escrow the per-machine LUKS recovery passphrase (signed with the machine key)',
  })
  @ApiResponse({ status: 200, type: LuksRecoverySummaryEntity })
  @ApiResponse({ status: 401, description: 'Missing/invalid machine signature or replayed request' })
  @Post('/luks-escrow')
  async escrow(@Request() req: RawBodyRequest<ExpressRequest>, @Body() dto: SubmitLuksRecoveryDto) {
    const recovery = await this.luksEscrowService.escrow(req['machine'], dto, req.rawBody?.length ?? 0);
    return new LuksRecoverySummaryEntity(recovery as any);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'List escrowed LUKS recovery passphrases (without secrets)' })
  @ApiResponse({ status: 200, type: [LuksRecoverySummaryEntity] })
  @Get('/luks-escrow')
  async list() {
    const recoveries = await this.luksEscrowService.list();
    return recoveries.map((r) => new LuksRecoverySummaryEntity(r as any));
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Read a machine escrowed LUKS recovery passphrase' })
  @ApiResponse({ status: 200, type: LuksRecoveryEntity })
  @Get('/luks-escrow/:username')
  async getForMachine(@Param('username') username: string) {
    const recovery = await this.luksEscrowService.getForMachine(username);
    return new LuksRecoveryEntity(recovery as any);
  }
}
