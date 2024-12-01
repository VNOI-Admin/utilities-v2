import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Query,
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

import { GetUserDto } from './dtos/getUser.dto';
import { MachineUsageEntity, UserEntity } from '@libs/common/dtos/User.entity';
import { UserService } from './user.service';

@ApiTags('User')
@Controller('users')
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ excludeExtraneousValues: true })
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiBearerAuth()
  // @UseGuards(AccessTokenGuard)
  // @RequiredRoles(Role.COACH, Role.ADMIN)
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'Return all users',
    type: [UserEntity],
  })
  @Get('/')
  async getUsers(@Query() query: GetUserDto) {
    return await this.userService.getUsers(query);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.COACH, Role.ADMIN)
  @ApiOperation({ summary: 'Get user by username' })
  @ApiResponse({
    status: 200,
    description: 'Return user',
    type: UserEntity,
  })
  @Get('/:username')
  async getUser(@Param('username') username: string) {
    return await this.userService.getUserByUsername(username);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.COACH, Role.ADMIN)
  @ApiOperation({ summary: 'Get machine usage of user' })
  @ApiResponse({
    status: 200,
    description: 'Return machine usage',
    type: MachineUsageEntity,
  })
  @Get('/:username/machine')
  async getMachineUsage(@Param('username') username: string) {
    return await this.userService.getMachineUsage(username);
  }
}
