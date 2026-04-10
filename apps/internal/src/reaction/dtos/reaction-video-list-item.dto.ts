import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReactionVideoListItemDto {
  @ApiProperty({ description: 'S3 object key' })
  key!: string;

  @ApiProperty({ description: 'Public URL for the WebM' })
  url!: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  lastModified?: string;

  @ApiPropertyOptional({ description: 'Object size in bytes' })
  size?: number;
}
