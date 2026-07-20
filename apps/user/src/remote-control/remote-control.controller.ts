import { AccessTokenOptional } from '@libs/common/decorators/accessTokenOptional.decorator';
import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import { IPAddressGuard } from '@libs/common/guards/ipAddress.guard';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Request,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { AgentJobUpdateDto } from './agentJobUpdate.dto';
import { RemoteControlService } from './remote-control.service';

@ApiTags('Remote Control')
@Controller('remote-control')
export class RemoteControlController {
  constructor(private readonly service: RemoteControlService) {}

  @ApiBearerAuth()
  @AccessTokenOptional()
  @UseGuards(AccessTokenGuard, IPAddressGuard)
  @RequiredRoles(Role.ADMIN, Role.CONTESTANT, Role.GUEST)
  @ApiOperation({ summary: 'Get script by name' })
  @ApiResponse({
    status: 200,
    schema: {
      required: ['name', 'hash', 'content', 'createdAt', 'updatedAt'],
      properties: {
        name: { type: 'string' },
        hash: { type: 'string' },
        content: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @Get('/scripts/:name')
  getScript(@Param('name') name: string) {
    return this.service.getScriptByName(name);
  }

  @UseGuards(IPAddressGuard)
  @RequiredRoles(Role.CONTESTANT, Role.GUEST)
  @ApiOperation({ summary: 'Post job updates (status/log)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        payload: { type: 'string', description: 'JSON AgentJobUpdateDto' },
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
      required: ['payload'],
    },
  })
  @ApiResponse({ status: 200, schema: { properties: { success: { type: 'boolean' } } } })
  @UseInterceptors(AnyFilesInterceptor())
  @Post('/agent/jobs/:jobId/updates')
  async agentUpdate(
    @Request() req: any,
    @Param('jobId') jobId: string,
    @Body('payload') payload: string,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    const dto = plainToInstance(AgentJobUpdateDto, this.parsePayload(payload));
    if (validateSync(dto).length) throw new BadRequestException('Invalid payload');

    await this.service.applyAgentUpdate(jobId, req.user, dto, files);
    return { success: true };
  }

  private parsePayload(payload: string) {
    try {
      return JSON.parse(payload);
    } catch {
      throw new BadRequestException('Invalid payload');
    }
  }
}
