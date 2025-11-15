import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsObject, IsUrl } from 'class-validator';
import { StreamStatus } from '@libs/common-db/schemas/contestant.schema';

export class CreateContestantDto {
  @ApiProperty({ description: 'Contestant name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Unique contestant identifier' })
  @IsString()
  contestantId: string;

  @ApiPropertyOptional({ description: 'HLS stream URL for main screen' })
  @IsOptional()
  @IsUrl()
  streamUrl?: string;

  @ApiPropertyOptional({ description: 'HLS stream URL for webcam' })
  @IsOptional()
  @IsUrl()
  webcamUrl?: string;

  @ApiPropertyOptional({
    description: 'Stream status',
    enum: StreamStatus,
    default: StreamStatus.OFFLINE,
  })
  @IsOptional()
  @IsEnum(StreamStatus)
  status?: StreamStatus;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Thumbnail preview URL' })
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;
}
