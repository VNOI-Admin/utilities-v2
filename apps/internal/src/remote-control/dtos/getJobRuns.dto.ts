import { RemoteJobRunStatus } from '@libs/common-db/schemas/remoteJobRun.schema';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export class GetRemoteControlJobRunsDto {
  @ApiProperty({ required: false, enum: RemoteJobRunStatus })
  @IsOptional()
  @IsEnum(RemoteJobRunStatus)
  status?: RemoteJobRunStatus;
}
