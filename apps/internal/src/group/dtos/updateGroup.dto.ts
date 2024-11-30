import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateGroupDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  code: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fullName: string;
}
