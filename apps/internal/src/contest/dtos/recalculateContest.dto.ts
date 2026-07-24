import { ApiProperty } from '@nestjs/swagger';

export class RecalculateContestResponseDto {
  @ApiProperty({ description: 'Number of submissions whose rank/score snapshot was rewritten' })
  submissionsUpdated!: number;

  @ApiProperty({ description: 'Number of participants whose standings were recomputed' })
  participantsUpdated!: number;

  @ApiProperty({ description: 'Human-readable summary' })
  message!: string;
}
