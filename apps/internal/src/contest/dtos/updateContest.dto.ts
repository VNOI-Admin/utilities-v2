import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
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

  @ApiProperty({
    required: false,
    description:
      'Minutes of penalty per counted attempt. Left unset the format decides: ICPC 20, VNOJ 5.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  penalty?: number;

  @ApiProperty({
    required: false,
    description:
      'VNOJ only — Last Submission Only. When set, cumulative time is the time of the single latest scoring submission instead of the sum across problems.',
  })
  @IsOptional()
  @IsBoolean()
  lso?: boolean;
}
