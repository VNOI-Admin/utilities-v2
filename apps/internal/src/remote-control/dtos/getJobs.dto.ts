import { RemoteJobRunStatus } from '@libs/common-db/schemas/remoteJobRun.schema';
import { PaginatedSortDto } from '@libs/common/dtos/sort.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';

export class GetRemoteControlJobsDto extends PaginatedSortDto {
  @ApiProperty({ required: false, enum: RemoteJobRunStatus })
  @IsOptional()
  @IsEnum(RemoteJobRunStatus)
  runStatus?: RemoteJobRunStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  scriptName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiProperty({ required: false, description: 'ISO date (UTC)' })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  @IsDate()
  from?: Date;

  @ApiProperty({ required: false, description: 'ISO date (UTC)' })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  @IsDate()
  to?: Date;
}
