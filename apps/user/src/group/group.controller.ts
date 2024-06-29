import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
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

import { CreateGroupDto } from './dtos/createGroup.dto';
import { GroupEntity } from './entities/Group.entity';
import { UserEntity } from '../user/entities/User.entity';
import { GroupService } from './group.service';

@ApiTags('Group')
@Controller('group')
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ excludeExtraneousValues: true })
export class GroupController {
  constructor(private readonly userService: GroupService) {}

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
    return await this.userService.getGroups();
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
  @Post('/new')
  async createGroup(@Body() createGroupDto: CreateGroupDto) {
    return await this.userService.createGroup(createGroupDto);
  }
}
