import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ContestFormat } from '@libs/common-db/schemas/contest.schema';

export class UpdateContestDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  start_time?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  end_time?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  frozen_at?: string;

  @ApiProperty({
    required: false,
    enum: ContestFormat,
    description: 'Ranking format: ICPC (default, ranked by AC count) or VNOJ (ranked by points)',
  })
  @IsOptional()
  @IsEnum(ContestFormat)
  format?: ContestFormat;

  @ApiProperty({ required: false, description: 'Minutes of penalty per wrong submission' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  penalty?: number;
}
