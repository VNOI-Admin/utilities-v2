import { RequiredRoles, Role } from '@libs/common/decorators/role.decorator';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ReactionVideoListItemDto } from './dtos/reaction-video-list-item.dto';
import { ReactionService } from './reaction.service';

@ApiTags('Reactions')
@Controller('reactions')
export class ReactionController {
  constructor(private readonly reactionService: ReactionService) {}

  @ApiBearerAuth()
  @UseGuards(AccessTokenGuard)
  @RequiredRoles(Role.ADMIN)
  @ApiOperation({ summary: 'List reaction MP4 objects in S3' })
  @ApiResponse({
    status: 200,
    description: 'Objects under the configured reaction prefix',
    type: [ReactionVideoListItemDto],
  })
  @ApiResponse({ status: 503, description: 'Reaction S3 env not configured' })
  @Get()
  async listRenderedMp4s(): Promise<ReactionVideoListItemDto[]> {
    return this.reactionService.listRenderedMp4s();
  }
}
