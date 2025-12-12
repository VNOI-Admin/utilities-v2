import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MultiUserStreamDto } from './dtos/multi-user-stream.dto';
import { SingleUserStreamDto } from './dtos/single-user-stream.dto';
import { WebcamLayoutDto } from './dtos/webcam-layout.dto';
import { GlobalConfigDto } from './dtos/global-config.dto';
import { SingleContestantConfigDto } from './dtos/single-contestant-config.dto';
import { MultiContestantConfigDto } from './dtos/multi-contestant-config.dto';
import { AnnouncementConfigDto } from './dtos/announcement.dto';
import { RankingConfigDto } from './dtos/ranking-config.dto';
import { UserStream } from './layouts/user-stream';
import { WebcamLayout } from './layouts/webcam-layout';
import { GlobalConfig } from './layouts/global-config';
import { SingleContestantConfig } from './layouts/single-contestant-config';
import { MultiContestantConfig } from './layouts/multi-contestant-config';
import { AnnouncementConfig } from './layouts/announcement-config';
import { RankingConfig } from './layouts/ranking-config';
import { OverlayService, type SubmissionWithAuthor } from './overlay.service';
import { OverlayLayoutResponse } from './responses/overlay-latout.response';

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
    summary: 'Get current layout',
  })
  @ApiResponse({
    status: 200,
    description: 'Current layout retrieved successfully',
    type: OverlayLayoutResponse,
  })
  @Get('/current')
  getCurrentLayout() {
    return this.overlayService.getCurrentLayout();
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

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get current webcam layout',
  })
  @ApiResponse({
    status: 200,
    description: 'Webcam layout retrieved successfully',
    type: WebcamLayout,
  })
  @Get('/webcam-layout')
  getWebcamLayout() {
    return this.overlayService.getWebcamLayout();
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({
    summary: 'Set current webcam layout',
  })
  @ApiBody({
    type: WebcamLayoutDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Webcam layout set successfully',
    type: WebcamLayout,
  })
  @Post('/webcam-layout')
  async setWebcamLayout(@Body() body: WebcamLayoutDto) {
    return await this.overlayService.setWebcamLayout(body);
  }

  // New endpoints for overlay feature

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN, Role.COACH)
  @ApiOperation({
    summary: 'Get global overlay configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Global configuration retrieved successfully',
    type: GlobalConfig,
  })
  @Get('/config/global')
  getGlobalConfig() {
    return this.overlayService.getGlobalConfig();
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({
    summary: 'Set global overlay configuration',
  })
  @ApiBody({
    type: GlobalConfigDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Global configuration set successfully',
    type: GlobalConfig,
  })
  @Post('/config/global')
  async setGlobalConfig(@Body() body: GlobalConfigDto) {
    return await this.overlayService.setGlobalConfig(body);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get single contestant overlay configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Single contestant configuration retrieved successfully',
    type: SingleContestantConfig,
  })
  @Get('/config/single-contestant')
  getSingleContestantConfig() {
    return this.overlayService.getSingleContestantConfig();
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({
    summary: 'Set single contestant overlay configuration',
  })
  @ApiBody({
    type: SingleContestantConfigDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Single contestant configuration set successfully',
    type: SingleContestantConfig,
  })
  @Post('/config/single-contestant')
  async setSingleContestantConfig(@Body() body: SingleContestantConfigDto) {
    return await this.overlayService.setSingleContestantConfig(body);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get multi contestant overlay configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Multi contestant configuration retrieved successfully',
    type: MultiContestantConfig,
  })
  @Get('/config/multi-contestant')
  getMultiContestantConfig() {
    return this.overlayService.getMultiContestantConfig();
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({
    summary: 'Set multi contestant overlay configuration',
  })
  @ApiBody({
    type: MultiContestantConfigDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Multi contestant configuration set successfully',
    type: MultiContestantConfig,
  })
  @Post('/config/multi-contestant')
  async setMultiContestantConfig(@Body() body: MultiContestantConfigDto) {
    return await this.overlayService.setMultiContestantConfig(body);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get announcements configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Announcements retrieved successfully',
    type: AnnouncementConfig,
  })
  @Get('/announcements')
  getAnnouncements() {
    return this.overlayService.getAnnouncements();
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({
    summary: 'Set announcements configuration',
  })
  @ApiBody({
    type: AnnouncementConfigDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Announcements set successfully',
    type: AnnouncementConfig,
  })
  @Post('/announcements')
  async setAnnouncements(@Body() body: AnnouncementConfigDto) {
    return await this.overlayService.setAnnouncements(body);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get recent submissions for a contest',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent submissions retrieved successfully',
  })
  @Get('/submissions/:contestCode')
  async getRecentSubmissions(
    @Param('contestCode') contestCode: string,
    @Query('limit') limit?: number,
  ): Promise<SubmissionWithAuthor[]> {
    return await this.overlayService.getRecentSubmissions(contestCode, limit || 10);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get ranking configuration',
  })
  @ApiResponse({
    status: 200,
    description: 'Ranking configuration retrieved successfully',
    type: RankingConfig,
  })
  @Get('/config/ranking')
  getRankingConfig() {
    return this.overlayService.getRankingConfig();
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({
    summary: 'Set ranking configuration',
  })
  @ApiBody({
    type: RankingConfigDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Ranking configuration set successfully',
    type: RankingConfig,
  })
  @Post('/config/ranking')
  async setRankingConfig(@Body() body: RankingConfigDto) {
    return await this.overlayService.setRankingConfig(body);
  }
}
