import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export enum DisplayMode {
  BOTH = 'both',
  STREAM_ONLY = 'stream_only',
  WEBCAM_ONLY = 'webcam_only',
}

export class SingleContestantConfigDto {
  @ApiProperty({ description: 'Username of the contestant' })
  @IsString()
  username!: string;

  @ApiProperty({
    description: 'Display mode for sources',
    enum: DisplayMode,
    default: DisplayMode.BOTH,
  })
  @IsEnum(DisplayMode)
  @IsOptional()
  displayMode?: DisplayMode;

  @ApiProperty({ description: 'Swap stream and webcam positions', default: false })
  @IsBoolean()
  @IsOptional()
  swapSources?: boolean;
}
