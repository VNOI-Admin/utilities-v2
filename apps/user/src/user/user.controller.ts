import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  Request,
  SerializeOptions,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CreateUserDto } from './dtos/createUser.dto';
import { GetUserDto } from './dtos/getUser.dto';
import { ReportUsageDto } from './dtos/reportUsage.dto';
import { UpdateUserDto } from './dtos/updateUser.dto';
import { MachineUsageEntity, UserEntity } from './entities/User.entity';
import { UserService } from './user.service';

@ApiTags('User')
@Controller('user')
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ excludeExtraneousValues: true })
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.COACH, Role.ADMIN)
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
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({
    status: 200,
    description: 'Return user',
    type: UserEntity,
  })
  @Get('/me')
  async getCurrentUser(@Request() req: any) {
    const callerId = req.user['sub'];
    return await this.userService.getUserById(callerId);
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
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Create new user' })
  @ApiResponse({
    status: 200,
    description: 'Return user',
    type: UserEntity,
  })
  @Post('/new')
  async createUser(@Body() createUserDto: CreateUserDto) {
    return await this.userService.createUser(createUserDto);
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
  async updateUser(
    @Param('username') username: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
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
  async deleteUser(@Param('username') username: string, @Request() req: any) {
    return await this.userService.deleteUser(username);
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
  async getMachineUsage(
    @Param('username') username: string,
    @Request() req: any,
  ) {
    return await this.userService.getMachineUsage(username);
  }

  @ApiOperation({
    summary: 'Receive machine status report from contestant. Verified by IP.',
  })
  @ApiResponse({
    status: 200,
    description: 'Update user machine usage report',
  })
  @Post('/report')
  async report(@Request() req: any, @Body() report: ReportUsageDto) {
    // Get caller ip address
    const callerIp =
      req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const callerId = await this.userService.getUserByIp(callerIp);
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
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 })],
      }),
    )
    file: Express.Multer.File,
  ) {
    const callerIp =
      req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const callerId = await this.userService.getUserByIp(callerIp);
    return await this.userService.print(callerId, file);
  }
}
