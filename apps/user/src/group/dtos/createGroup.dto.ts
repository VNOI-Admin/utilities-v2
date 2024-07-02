import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({ required: true })
  @IsString()
  groupCodeName: string;

  @ApiProperty({ required: true })
  @IsString()
  groupFullName: string;
}
