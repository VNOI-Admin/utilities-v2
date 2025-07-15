import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MultiUserStreamDto } from './dtos/multi-user-stream.dto';
import { SingleUserStreamDto } from './dtos/single-user-stream.dto';
import { UserStream } from './layouts/user-stream';
import { OverlayService } from './overlay.service';

@ApiTags('Overlay')
@Controller('overlay')
export class OverlayController {
  constructor(private readonly overlayService: OverlayService) {}

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN, Role.COACH)
  @ApiOperation({
    summary: 'Get stream source by username',
  })
  @ApiResponse({
    status: 200,
    description: 'Stream source retrieved successfully',
    type: UserStream,
  })
  @Get('/source/:username')
  getStreamSourceByUsername(@Param('username') username: string) {
    return this.overlayService.getStreamSourceByUsername(username);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get multiple users to user stream display',
  })
  @ApiResponse({
    status: 200,
    description: 'User stream display retrieved successfully',
    type: [UserStream],
  })
  @Get('/user-stream/multi')
  getMultiUserStream() {
    return this.overlayService.getMultiUserStream();
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({
    summary: 'Set multiple users to user stream display',
  })
  @ApiBody({
    type: MultiUserStreamDto,
  })
  @ApiResponse({
    status: 200,
    description: 'User stream display set successfully',
    type: [UserStream],
  })
  @Post('/user-stream/multi')
  setMultiUserStream(@Body() body: MultiUserStreamDto) {
    return this.overlayService.setMultiUserStream(body.usernames);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get current user stream display',
  })
  @ApiResponse({
    status: 200,
    description: 'User stream display retrieved successfully',
    type: UserStream,
  })
  @Get('/user-stream/single')
  getUserStream() {
    return this.overlayService.getUserStream();
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({
    summary: 'Set current user to user stream display',
  })
  @ApiBody({
    type: SingleUserStreamDto,
  })
  @ApiResponse({
    status: 200,
    description: 'User stream display set successfully',
    type: UserStream,
  })
  @Post('/user-stream/single')
  async setUserStream(@Body() body: SingleUserStreamDto) {
    return await this.overlayService.setUserStream(body);
  }
}
