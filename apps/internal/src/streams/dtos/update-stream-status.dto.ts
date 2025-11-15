import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { StreamStatus } from '@libs/common-db/schemas/contestant.schema';

export class UpdateStreamStatusDto {
  @ApiProperty({
    description: 'New stream status',
    enum: StreamStatus,
  })
  @IsEnum(StreamStatus)
  status: StreamStatus;
}
