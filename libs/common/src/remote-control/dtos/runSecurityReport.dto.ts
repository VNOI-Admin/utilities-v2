import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsOptional, IsString } from 'class-validator';

export class RunSecurityReportDto {
  @ApiProperty({ required: false, type: [String], description: 'Defaults to all eligible machines' })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  targets?: string[];
}
