import { RemoteJobRunStatus } from '@libs/common-db/schemas/remoteJobRun.schema';
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class AgentJobUpdateDto {
  @ApiProperty({ required: true, enum: RemoteJobRunStatus })
  @IsEnum(RemoteJobRunStatus)
  status!: RemoteJobRunStatus;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  exitCode?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  log?: string;
}
