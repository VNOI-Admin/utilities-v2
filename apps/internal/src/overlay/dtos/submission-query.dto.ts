import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class SubmissionQueryDto {
  @ApiProperty({ description: 'Contest code to filter submissions' })
  @IsString()
  contestCode!: string;

  @ApiProperty({ description: 'Number of recent submissions to return', default: 10 })
  @IsNumber()
  @IsOptional()
  limit?: number;
}
