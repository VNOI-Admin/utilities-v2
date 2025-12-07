import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { UserEntity } from '@libs/common/dtos/User.entity';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { BatchCreateUsersDto } from './dtos/batchCreateUsers.dto';
import { BatchCreateUsersResponseDto } from './dtos/batchCreateUsersResponse.dto';
import { BulkDeleteUsersDto, BulkDeleteUsersResponseDto } from './dtos/bulkDeleteUsers.dto';
import { CreateUserDto } from './dtos/createUser.dto';
import { GetUsersDto } from './dtos/getUsers.dto';
import { UpdateUserDto } from './dtos/updateUser.dto';
import { UserService } from './user.service';

@ApiTags('User')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN, Role.COACH)
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'Return users',
    type: [UserEntity],
  })
  @Get('/')
  async getUsers(@Req() req: Request, @Query() query: GetUsersDto) {
    return await this.userService.getUsers(req.user?.['sub'], query);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN, Role.COACH)
  @ApiOperation({ summary: 'Get user by username' })
  @ApiResponse({
    status: 200,
    description: 'Return user',
    type: UserEntity,
  })
  @Get('/:username')
  async getUser(@Param('username') username: string) {
    return await this.userService.getUser(username);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Create new user' })
  @ApiResponse({
    status: 200,
    description: 'Return user',
    type: UserEntity,
  })
  @Post('/')
  async createUser(@Body() createUserDto: CreateUserDto) {
    return await this.userService.createUser(createUserDto);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({
    summary: 'Batch create users',
    description: 'Create multiple users at once with a single role. Groups are auto-created if they do not exist.',
  })
  @ApiResponse({
    status: 200,
    description: 'Batch creation result with per-user status',
    type: BatchCreateUsersResponseDto,
  })
  @Post('/batch')
  async batchCreateUsers(@Body() dto: BatchCreateUsersDto) {
    return await this.userService.batchCreateUsers(dto);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({
    summary: 'Bulk delete users',
    description: 'Delete multiple users matching the filter criteria. Requires a text query to prevent accidental mass deletion. The admin user is never deleted.',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk deletion result',
    type: BulkDeleteUsersResponseDto,
  })
  @Delete('/bulk')
  async bulkDeleteUsers(@Query() dto: BulkDeleteUsersDto) {
    return await this.userService.bulkDeleteUsers(dto);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Update user' })
  @ApiResponse({
    status: 200,
    description: 'Return user',
    type: UserEntity,
  })
  @Patch('/:username')
  async updateUser(@Param('username') username: string, @Body() updateUserDto: UpdateUserDto) {
    return await this.userService.updateUser(username, updateUserDto);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete user' })
  @ApiResponse({
    status: 200,
    description: 'Return user',
    schema: {
      properties: { success: { type: 'boolean' } },
    },
  })
  @Delete('/:username')
  async deleteUser(@Param('username') username: string) {
    return await this.userService.deleteUser(username);
  }
}
