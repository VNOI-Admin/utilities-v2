import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { StreamStatus } from '@libs/common-db/schemas/contestant.schema';

export class ContestantResponseDto {
  @ApiProperty()
  @Expose()
  _id: string;

  @ApiProperty()
  @Expose()
  name: string;

  @ApiProperty()
  @Expose()
  contestantId: string;

  @ApiPropertyOptional()
  @Expose()
  streamUrl?: string;

  @ApiPropertyOptional()
  @Expose()
  webcamUrl?: string;

  @ApiProperty({ enum: StreamStatus })
  @Expose()
  status: StreamStatus;

  @ApiPropertyOptional()
  @Expose()
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  @Expose()
  thumbnailUrl?: string;

  @ApiPropertyOptional()
  @Expose()
  lastActiveAt?: Date;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;
}
