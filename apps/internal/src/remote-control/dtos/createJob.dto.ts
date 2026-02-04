import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateRemoteControlJobDto {
  @ApiProperty({ required: true })
  @IsString()
  scriptName!: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  args?: string[];

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  env?: Record<string, string>;

  @ApiProperty({ required: true, type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  targets!: string[];
}

