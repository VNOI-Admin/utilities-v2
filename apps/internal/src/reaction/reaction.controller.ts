import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ReactionTimingResponseDto, UpdateReactionTimingDto } from './dtos/reaction-timing.dto';
import { ReactionVideoListItemDto } from './dtos/reaction-video-list-item.dto';
import { RegenerateReactionsResponseDto } from './dtos/regenerate-reactions.dto';
import { ReactionService } from './reaction.service';

@ApiTags('Reactions')
@Controller('reactions')
export class ReactionController {
  constructor(private readonly reactionService: ReactionService) {}

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'List rendered reaction videos in S3' })
  @ApiResponse({
    status: 200,
    description: 'Objects under the configured reaction prefix, enriched with submission data',
    type: [ReactionVideoListItemDto],
  })
  @ApiResponse({ status: 503, description: 'Reaction S3 env not configured' })
  @Get()
  async listRenderedVideos(): Promise<ReactionVideoListItemDto[]> {
    return this.reactionService.listRenderedVideos();
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({
    summary: 'Effective reaction timing, with the range metadata the settings page renders from',
  })
  @ApiResponse({ status: 200, type: ReactionTimingResponseDto })
  @Get('timing')
  async getTiming(): Promise<ReactionTimingResponseDto> {
    return this.reactionService.getTiming();
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Store reaction timing overrides; returns the new effective timing' })
  @ApiResponse({ status: 201, type: ReactionTimingResponseDto })
  @Post('timing')
  async updateTiming(@Body() body: UpdateReactionTimingDto): Promise<ReactionTimingResponseDto> {
    return this.reactionService.updateTiming(body?.values);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Re-render the reaction video for every accepted submission in a contest' })
  @ApiResponse({ status: 201, type: RegenerateReactionsResponseDto })
  @Post('contests/:code/regenerate')
  async regenerateContestReactions(@Param('code') code: string): Promise<RegenerateReactionsResponseDto> {
    return this.reactionService.regenerateContestReactions(code);
  }

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'Re-render the reaction video for a single submission' })
  @ApiResponse({ status: 201, type: RegenerateReactionsResponseDto })
  @Post('submissions/:submissionId/regenerate')
  async regenerateSubmissionReaction(
    @Param('submissionId') submissionId: string,
  ): Promise<RegenerateReactionsResponseDto> {
    return this.reactionService.regenerateSubmissionReaction(submissionId);
  }
}
