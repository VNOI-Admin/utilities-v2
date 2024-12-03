import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  SerializeOptions,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { GroupEntity } from '@libs/common/dtos/Group.entity';
import { UserEntity } from '@libs/common/dtos/User.entity';
import { GroupService } from './group.service';

@ApiTags('Group')
@Controller('groups')
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ excludeExtraneousValues: true })
export class GroupController {
  constructor(private readonly groupService: GroupService) {}

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all groups' })
  @ApiResponse({
    status: 200,
    description: 'Return all groups',
    type: [GroupEntity],
  })
  @Get('/')
  async getGroups() {
    return await this.groupService.getGroups();
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Get users in group' })
  @ApiResponse({
    status: 200,
    description: 'Return users',
    type: [UserEntity],
  })
  @Get('/:code/users')
  async getUsers(@Param('code') code: string) {
    return await this.groupService.getUsersInGroup(code);
  }
}
