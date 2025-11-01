import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export enum ContestFilter {
  ONGOING = 'ongoing',
  PAST = 'past',
  FUTURE = 'future',
  ALL = 'all',
}

export class GetContestsDto {
  @ApiProperty({ required: false, enum: ContestFilter, default: ContestFilter.ALL })
  @IsOptional()
  @IsEnum(ContestFilter)
  filter?: ContestFilter = ContestFilter.ALL;
}
