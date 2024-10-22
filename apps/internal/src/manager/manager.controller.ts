import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CreateUserDto } from '../../../internal/src/manager/dtos/createUser.dto';
import { UpdateUserDto } from '../../../internal/src/manager/dtos/updateUser.dto';
import { CreateGroupDto } from '../../../internal/src/manager/dtos/createGroup.dto';
import { UpdateGroupDto } from '../../../internal/src/manager/dtos/updateGroup.dto';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ManagerService } from './manager.service';
import { UserEntity } from '../../../user/src/user/entities/User.entity';
import { GroupEntity } from '../../../user/src/group/entities/Group.entity';

@ApiTags('Internal')
@Controller('')
export class ManagerController {
  constructor(private readonly managerService: ManagerService) {}

  /** User */
  @ApiBearerAuth()
  //@UseGuards(AccessTokenGuard)
  //@RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Create new user' })
  @ApiResponse({
    status: 200,
    description: 'Return user',
    type: UserEntity,
  })
  @Post('users/')
  async createUser(@Body() createUserDto: CreateUserDto) {
    return await this.managerService.createUser(createUserDto);
  }

  @ApiBearerAuth()
  //@UseGuards(AccessTokenGuard)
  //@RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({
    status: 200,
    description: 'Return user',
    type: UserEntity,
  })
  @Patch('users/:username')
  async updateUser(
    @Param('username') username: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return await this.managerService.updateUser(username, updateUserDto);
  }

  @ApiBearerAuth()
  //@UseGuards(AccessTokenGuard)
  //@RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({
    status: 200,
    description: 'Return user',
    schema: {
      properties: { success: { type: 'boolean' } },
    },
  })
  @Delete('users/:username')
  async deleteUser(@Param('username') username: string) {
    return await this.managerService.deleteUser(username);
  }

  /** Group **/

  @ApiBearerAuth()
  // @UseGuards(AccessTokenGuard)
  // @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Create new group' })
  @ApiResponse({
    status: 200,
    description: 'Return group',
    type: GroupEntity,
  })
  @Post('groups/')
  async createGroup(@Body() createGroupDto: CreateGroupDto) {
    return await this.managerService.createGroup(createGroupDto);
  }
  @ApiBearerAuth()
  // @UseGuards(AccessTokenGuard)
  // @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Update group' })
  @ApiResponse({
    status: 200,
    description: 'Return group',
    type: GroupEntity,
  })
  @Patch('groups/:groupCodeName')
  async updateGroup(
    @Param('groupCodeName') groupCodeName: string,
    @Body() updateGroupDto: UpdateGroupDto,
  ) {
    return await this.managerService.updateGroup(groupCodeName, updateGroupDto);
  }

  @ApiBearerAuth()
  // @UseGuards(AccessTokenGuard)
  // @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete group' })
  @ApiResponse({
    status: 200,
    description: 'Return status',
    schema: { properties: { success: { type: 'boolean' } } },
  })
  @Delete('groups/:groupCodeName')
  async deleteGroup(@Param('groupCodeName') groupCodeName: string) {
    return await this.managerService.deleteGroup(groupCodeName);
  }
}
