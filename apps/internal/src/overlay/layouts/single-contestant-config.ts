import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ConstructorType } from '@libs/common/serializers/type';
import { OverlayLayout } from './generic';
import { OVERLAY_KEYS } from '@libs/common/types/overlay';
import { DisplayMode } from '../dtos/single-contestant-config.dto';

export const SINGLE_CONTESTANT_KEY = OVERLAY_KEYS.SINGLE_CONTESTANT;

export class SingleContestantConfig implements OverlayLayout {
  @Expose()
  @ApiProperty()
  @IsString()
  username: string;

  @Expose()
  @ApiProperty({ enum: DisplayMode })
  @IsEnum(DisplayMode)
  @IsOptional()
  displayMode?: DisplayMode;

  @Expose()
  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  swapSources?: boolean;

  constructor(data: ConstructorType<SingleContestantConfig>) {
    this.username = data.username;
    this.displayMode = data.displayMode || DisplayMode.BOTH;
    this.swapSources = data.swapSources || false;
  }

  toRecord() {
    return {
      username: this.username,
      displayMode: this.displayMode,
      swapSources: this.swapSources,
    };
  }
}
