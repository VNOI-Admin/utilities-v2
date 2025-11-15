import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { StreamStatus } from '@libs/common-db/schemas/contestant.schema';

export class StreamResponseDto {
  @ApiProperty()
  @Expose()
  contestantId: string;

  @ApiProperty()
  @Expose()
  contestantName: string;

  @ApiPropertyOptional({ description: 'HLS stream URL for main screen' })
  @Expose()
  streamUrl?: string;

  @ApiPropertyOptional({ description: 'HLS stream URL for webcam' })
  @Expose()
  webcamUrl?: string;

  @ApiProperty({ enum: StreamStatus })
  @Expose()
  status!: StreamStatus;

  @ApiPropertyOptional()
  @Expose()
  lastActiveAt?: Date;
}
