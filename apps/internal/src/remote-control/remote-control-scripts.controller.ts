import { OptionalAccessTokenAuth } from '@libs/common/decorators/optionalAccessTokenAuth.decorator';
import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import { IPAddressGuard } from '@libs/common/guards/ipAddress.guard';
import { Body, ClassSerializerInterceptor, Controller, Delete, Get, Param, Patch, Post, SerializeOptions, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateRemoteControlScriptDto } from './dtos/createScript.dto';
import { UpdateRemoteControlScriptDto } from './dtos/updateScript.dto';
import { RemoteControlScriptEntity, RemoteControlScriptSummaryEntity } from './entities/remoteControlScript.entity';
import { RemoteControlScriptsService } from './remote-control-scripts.service';

@ApiTags('Remote Control')
@Controller('remote-control/scripts')
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ excludeExtraneousValues: true })
export class RemoteControlScriptsController {
  constructor(private readonly remoteControlScriptsService: RemoteControlScriptsService) {}

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'List scripts' })
  @ApiResponse({
    status: 200,
    description: 'Return scripts (content omitted)',
    type: [RemoteControlScriptSummaryEntity],
  })
  @Get('/')
  async listScripts(): Promise<RemoteControlScriptSummaryEntity[]> {
    const scripts = await this.remoteControlScriptsService.listScripts();
    return scripts.map((script) => new RemoteControlScriptSummaryEntity(script as any));
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Create script' })
  @ApiResponse({
    status: 200,
    description: 'Return created script',
    type: RemoteControlScriptEntity,
  })
  @Post('/')
  async createScript(@Body() dto: CreateRemoteControlScriptDto): Promise<RemoteControlScriptEntity> {
    const script = await this.remoteControlScriptsService.createScript(dto.name, dto.content);
    return new RemoteControlScriptEntity(script as any);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard, IPAddressGuard)
  @OptionalAccessTokenAuth()
  @RequiredRoles(Role.ADMIN, Role.CONTESTANT)
  @ApiOperation({ summary: 'Get script by name' })
  @ApiResponse({
    status: 200,
    description: 'Return script',
    type: RemoteControlScriptEntity,
  })
  @Get('/:name')
  async getScriptByName(@Param('name') name: string): Promise<RemoteControlScriptEntity> {
    const script = await this.remoteControlScriptsService.getScriptByName(name);
    return new RemoteControlScriptEntity(script as any);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Update script content' })
  @ApiResponse({
    status: 200,
    description: 'Return updated script',
    type: RemoteControlScriptEntity,
  })
  @Patch('/:name')
  async updateScriptContent(
    @Param('name') name: string,
    @Body() dto: UpdateRemoteControlScriptDto,
  ): Promise<RemoteControlScriptEntity> {
    const script = await this.remoteControlScriptsService.updateScriptContent(name, dto.content);
    return new RemoteControlScriptEntity(script as any);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete script' })
  @ApiResponse({
    status: 200,
    description: 'Success',
    schema: {
      properties: { success: { type: 'boolean' } },
    },
  })
  @Delete('/:name')
  async deleteScript(@Param('name') name: string): Promise<{ success: true }> {
    return await this.remoteControlScriptsService.deleteScript(name);
  }
}

