import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Request,
  SerializeOptions,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AccessTokenGuard } from '../common/guards/accessToken.guard';
import { CreateGroupDto } from './dtos/createGroup.dto';
import { CreateUserDto } from './dtos/createUser.dto';
import { ReportUsageDto } from './dtos/reportUsage.dto';
import { GroupEntity } from './entities/Group.entity';
import { UserEntity } from './entities/User.entity';
import { UserService } from './user.service';

@ApiTags('User')
@Controller('user')
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ excludeExtraneousValues: true })
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'Return all users',
    type: [UserEntity],
  })
  @Get('/')
  async getUsers(@Request() req: any) {
    const calledId = req.user['sub'];
    await this.userService.checkPrivilege(calledId, ['admin', 'coach']);
    return await this.userService.getUsers();
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Get user by username' })
  @ApiResponse({
    status: 200,
    description: 'Return user',
    type: UserEntity,
  })
  @Get('/:username')
  async getUser(@Request() req: any, @Param('username') username: string) {
    const callerId = req.user['sub'];
    await this.userService.checkPrivilege(callerId, ['admin', 'coach']);
    return await this.userService.getUser(username);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Create new user' })
  @ApiResponse({
    status: 200,
    description: 'Return user',
    type: UserEntity,
  })
  @Post('/new')
  async createUser(@Request() req: any, @Body() createUserDto: CreateUserDto) {
    const callerId = req.user['sub'];
    await this.userService.checkPrivilege(callerId, ['admin']);
    return await this.userService.createUser(createUserDto);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Get all groups' })
  @ApiResponse({
    status: 200,
    description: 'Return all groups',
    type: [GroupEntity],
  })
  @Get('/group')
  async getGroups(@Request() req: any) {
    const callerId = req.user['sub'];
    await this.userService.checkPrivilege(callerId, ['admin', 'coach']);
    return await this.userService.getGroups();
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @ApiOperation({ summary: 'Create new group' })
  @ApiResponse({
    status: 200,
    description: 'Return group',
    type: GroupEntity,
  })
  @Post('/group/new')
  async createGroup(@Request() req: any, @Body() createGroupDto: CreateGroupDto) {
    const callerId = req.user['sub'];
    await this.userService.checkPrivilege(callerId, ['admin']);
    return await this.userService.createGroup(createGroupDto);
  }

  @ApiOperation({ summary: 'Receive machine status report from user' })
  @ApiResponse({
    status: 200,
    description: 'Update user machine usage report',
  })
  @Post('/report')
  async report(@Request() req: any, @Body() report: ReportUsageDto) {
    // Get caller ip address
    const callerIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const callerId = await this.userService.getUserByIp(callerIp);

    await this.userService.checkPrivilege(callerId, ['user']);
    return await this.userService.reportUsage(callerId, report);
  }

  @ApiOperation({ summary: 'Send print job' })
  @ApiResponse({
    status: 200,
    description: 'Receive print job',
  })
  @UseInterceptors(FileInterceptor('file'))
  @Post('/print')
  async print(
    @Request() req: any,
    @UploadedFile(
      new ParseFilePipe({ validators: [new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 })] })
    ) file: Express.Multer.File) {
    const callerIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const callerId = await this.userService.getUserByIp(callerIp);
    await this.userService.checkPrivilege(callerId, ['user', 'admin']);
    return await this.userService.print(callerId, file);
  }
}
