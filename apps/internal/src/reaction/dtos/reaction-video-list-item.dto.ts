import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReactionVideoListItemDto {
  @ApiProperty({ description: 'S3 object key' })
  key!: string;

  @ApiProperty({ description: 'Public URL for the rendered video' })
  url!: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  lastModified?: string;

  @ApiPropertyOptional({ description: 'Object size in bytes' })
  size?: number;

  @ApiPropertyOptional({ description: 'Submission id parsed from the object key' })
  submissionId?: string;

  @ApiPropertyOptional({ description: 'Display name of the team, when the submission is known' })
  teamName?: string;

  @ApiPropertyOptional({ description: 'Group / university of the mapped user' })
  group?: string;

  @ApiPropertyOptional({ description: 'VNOJ username that produced the submission' })
  author?: string;

  @ApiPropertyOptional({ description: 'Problem code, e.g. "E"' })
  problemCode?: string;

  @ApiPropertyOptional({
    description: 'Display name for the problem (manual override, falls back to the code)',
  })
  problemDisplayName?: string;

  @ApiPropertyOptional({ description: 'Contest code the submission belongs to' })
  contestCode?: string;

  @ApiPropertyOptional({ description: 'Judged verdict, e.g. "AC"' })
  status?: string;

  @ApiPropertyOptional({ description: 'Rank before this submission was judged' })
  rankBefore?: number;

  @ApiPropertyOptional({ description: 'Rank after this submission was judged' })
  rankAfter?: number;

  @ApiPropertyOptional({ type: String, format: 'date-time', description: 'Judged or submitted at' })
  submittedAt?: string;
}
