import { SortDto } from '@libs/common/dtos/sort.dto';
import { RemoteJobRunStatus } from '@libs/common-db/schemas/remoteJobRun.schema';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class GetRemoteControlJobsDto extends SortDto {
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
  @IsDateString()
  from?: string;

  @ApiProperty({ required: false, description: 'ISO date (UTC)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}

