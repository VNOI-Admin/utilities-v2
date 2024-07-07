import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateGroupDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  groupCodeName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  groupFullName: string;
}
