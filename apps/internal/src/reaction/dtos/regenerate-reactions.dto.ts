import { ApiProperty } from '@nestjs/swagger';

export class RegenerateReactionsResponseDto {
  @ApiProperty({ description: 'Number of submissions queued for a fresh render' })
  queued!: number;

  @ApiProperty({
    description: 'Submissions skipped because a render job for them was already pending',
  })
  alreadyQueued!: number;

  @ApiProperty({ description: 'Human-readable summary' })
  message!: string;
}
