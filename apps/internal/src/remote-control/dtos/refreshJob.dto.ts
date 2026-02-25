import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsBoolean, IsIn, IsString } from 'class-validator';

export class RefreshRemoteControlJobDto {
  @ApiProperty({ required: true, type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  targets!: string[];

  @ApiProperty({ required: true })
  @IsBoolean()
  includeLog!: boolean;

  @ApiProperty({ required: true, enum: ['sync', 'async'] })
  @IsIn(['sync', 'async'])
  mode!: 'sync' | 'async';
}
