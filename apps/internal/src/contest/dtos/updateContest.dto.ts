import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

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
}
