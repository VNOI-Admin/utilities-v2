import { Injectable, NotFoundException } from '@nestjs/common';
import { ContestantService } from '../contestant/contestant.service';
import { StreamStatus } from '@libs/common-db/schemas/contestant.schema';
import { StreamResponseDto } from './dtos/stream-response.dto';

@Injectable()
export class StreamsService {
  constructor(private readonly contestantService: ContestantService) {}

  async getStreams(contestantId: string): Promise<StreamResponseDto> {
    const contestant =
      await this.contestantService.findByContestantId(contestantId);

    if (!contestant) {
      throw new NotFoundException(
        `Contestant with ID ${contestantId} not found`,
      );
    }

    return {
      contestantId: contestant.contestantId,
      contestantName: contestant.name,
      streamUrl: contestant.streamUrl,
      webcamUrl: contestant.webcamUrl,
      status: contestant.status,
      lastActiveAt: contestant.lastActiveAt,
    };
  }

  async updateStreamStatus(
    contestantId: string,
    status: StreamStatus,
  ): Promise<StreamResponseDto> {
    const contestant =
      await this.contestantService.findByContestantId(contestantId);

    if (!contestant) {
      throw new NotFoundException(
        `Contestant with ID ${contestantId} not found`,
      );
    }

    const updated = await this.contestantService.updateStatus(
      contestant._id.toString(),
      status,
    );

    return {
      contestantId: updated.contestantId,
      contestantName: updated.name,
      streamUrl: updated.streamUrl,
      webcamUrl: updated.webcamUrl,
      status: updated.status,
      lastActiveAt: updated.lastActiveAt,
    };
  }
}
