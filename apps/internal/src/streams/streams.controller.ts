import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  SerializeOptions,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { StreamsService } from './streams.service';
import { StreamResponseDto } from './dtos/stream-response.dto';
import { UpdateStreamStatusDto } from './dtos/update-stream-status.dto';
import { AccessTokenGuard } from '@libs/common/guards/accessToken.guard';

@ApiTags('Streams')
@Controller('streams')
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ excludeExtraneousValues: true })
export class StreamsController {
  constructor(private readonly streamsService: StreamsService) {}

  @Get(':contestantId')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get stream URLs for a contestant' })
  @ApiParam({ name: 'contestantId', description: 'Contestant unique ID' })
  @ApiResponse({
    status: 200,
    description: 'Stream URLs retrieved successfully',
    type: StreamResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Contestant not found' })
  async getStreams(@Param('contestantId') contestantId: string) {
    return this.streamsService.getStreams(contestantId);
  }

  @Post(':contestantId/status')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update stream status' })
  @ApiParam({ name: 'contestantId', description: 'Contestant unique ID' })
  @ApiResponse({
    status: 200,
    description: 'Stream status updated successfully',
    type: StreamResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Contestant not found' })
  async updateStatus(
    @Param('contestantId') contestantId: string,
    @Body() updateStreamStatusDto: UpdateStreamStatusDto,
  ) {
    return this.streamsService.updateStreamStatus(
      contestantId,
      updateStreamStatusDto.status,
    );
  }
}
