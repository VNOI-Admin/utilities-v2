import { CreateGroupDto } from '../group/dtos/createGroup.dto';
import { UpdateGroupDto } from '../group/dtos/updateGroup.dto';

import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { GroupEntity } from '@libs/common/dtos/Group.entity';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { GroupService } from './group.service';

@ApiTags('Group')
@Controller('groups')
export class GroupController {
  constructor(private readonly groupService: GroupService) {}
  /** Group **/

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN, Role.COACH)
  @ApiOperation({ summary: 'Get all groups' })
  @ApiResponse({
    status: 200,
    description: 'Return list of groups',
    type: [GroupEntity],
  })
  @Get('/')
  async getGroups() {
    return await this.groupService.getGroups();
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Create new group' })
  @ApiResponse({
    status: 200,
    description: 'Return group',
    type: GroupEntity,
  })
  @Post('/')
  async createGroup(@Body() createGroupDto: CreateGroupDto) {
    return await this.groupService.createGroup(createGroupDto);
  }
  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Update group' })
  @ApiResponse({
    status: 200,
    description: 'Return group',
    type: GroupEntity,
  })
  @Patch('/:code')
  async updateGroup(@Param('code') code: string, @Body() updateGroupDto: UpdateGroupDto) {
    return await this.groupService.updateGroup(code, updateGroupDto);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete group' })
  @ApiResponse({
    status: 200,
    description: 'Return status',
    schema: { properties: { success: { type: 'boolean' } } },
  })
  @Delete('/:code')
  async deleteGroup(@Param('code') code: string) {
    return await this.groupService.deleteGroup(code);
  }
}
