import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import { Body, Controller, Delete, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApproveMachineDto } from './dtos/approveMachine.dto';
import { EnrollMachineDto } from './dtos/enrollMachine.dto';
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

  @ApiOperation({ summary: "The signing machine's code and approval status" })
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
