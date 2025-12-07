import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class RankingConfigDto {
  @ApiProperty({
    description: 'Current page/section (0-indexed)',
    default: 0,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  currentPage!: number;
}
