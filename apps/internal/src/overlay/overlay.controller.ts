import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OverlayService } from './overlay.service';
import { UserStream } from './layouts/user-stream';
import { MultiUserStreamDto } from './dtos/multi-user-stream.dto';

@ApiTags('Overlay')
@Controller('overlay')
export class OverlayController {
  constructor(private readonly overlayService: OverlayService) {}

  @ApiOperation({
    summary: 'Get multiple users to user stream display',
  })
  @ApiResponse({
    status: 200,
    description: 'User stream display retrieved successfully',
    type: [UserStream],
  })
  @Get('/user-stream')
  getMultiUserStream() {
    return this.overlayService.getMultiUserStream();
  }

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
  @Post('/user-stream')
  setMultiUserStream(@Body() body: MultiUserStreamDto) {
    return this.overlayService.setMultiUserStream(body.usernames);
  }

  @ApiOperation({
    summary: 'Get current user stream display',
  })
  @ApiResponse({
    status: 200,
    description: 'User stream display retrieved successfully',
    type: UserStream,
  })
  @Get('/user-stream/:username')
  getUserStream() {
    return this.overlayService.getUserStream();
  }

  @ApiOperation({
    summary: 'Set current user to user stream display',
  })
  @ApiResponse({
    status: 200,
    description: 'User stream display set successfully',
    type: UserStream,
  })
  @Post('/user-stream/:username')
  async setUserStream(@Param('username') username: string) {
    return await this.overlayService.setUserStream(username);
  }
}
