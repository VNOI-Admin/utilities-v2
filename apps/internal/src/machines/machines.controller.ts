import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import { Body, Controller, Delete, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApproveMachineDto } from './dtos/approveMachine.dto';
import { EnrollMachineDto } from './dtos/enrollMachine.dto';
import { RenameMachineDto } from './dtos/renameMachine.dto';
import { MachinesService } from './machines.service';

@ApiTags('Machines')
@Controller('machines')
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  @ApiOperation({ summary: 'Register a machine key; it waits for an admin to enter its code' })
  @Post('/enroll')
  enroll(@Body() dto: EnrollMachineDto, @Request() req: any) {
    return this.machinesService.enroll(dto, req.headers['x-real-ip'] ?? req.ip);
  }

  @ApiOperation({ summary: 'Single-use nonce for the next machine-signed request' })
  @Get('/challenge')
  challenge() {
    return this.machinesService.challenge();
  }

  @ApiOperation({ summary: "The signing machine's code, approval status, name and contestant login lock" })
  @Get('/me')
  me(@Request() req: any) {
    return this.machinesService.me(req);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'List machines' })
  @Get()
  list() {
    return this.machinesService.list();
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Approve the machine showing this code' })
  @Post('/approve')
  approve(@Body() dto: ApproveMachineDto, @Request() req: any) {
    return this.machinesService.approve(dto.code, req.user?.sub);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Approve the machine with this fingerprint' })
  @Post('/:fingerprint/approve')
  approveFingerprint(@Param('fingerprint') fingerprint: string, @Request() req: any) {
    return this.machinesService.approveFingerprint(fingerprint, req.user?.sub);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Rename a machine' })
  @Patch('/:fingerprint')
  rename(@Param('fingerprint') fingerprint: string, @Body() dto: RenameMachineDto) {
    return this.machinesService.rename(fingerprint, dto.name);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Revoke a machine' })
  @Post('/:fingerprint/revoke')
  revoke(@Param('fingerprint') fingerprint: string) {
    return this.machinesService.revoke(fingerprint);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a machine' })
  @Delete('/:fingerprint')
  remove(@Param('fingerprint') fingerprint: string) {
    return this.machinesService.remove(fingerprint);
  }
}
