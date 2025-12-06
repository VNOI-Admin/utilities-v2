import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { ConstructorType } from '@libs/common/serializers/type';
import { OverlayLayout } from './generic';
import { OVERLAY_KEYS } from '@libs/common/types/overlay';
import { LayoutMode } from '../dtos/multi-contestant-config.dto';

export const MULTI_CONTESTANT_KEY = OVERLAY_KEYS.MULTI_CONTESTANT;

export class MultiContestantConfig implements OverlayLayout {
  @Expose()
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  usernames: string[];

  @Expose()
  @ApiProperty({ enum: LayoutMode })
  @IsEnum(LayoutMode)
  @IsOptional()
  layoutMode?: LayoutMode;

  constructor(data: ConstructorType<MultiContestantConfig>) {
    this.usernames = data.usernames;
    this.layoutMode = data.layoutMode || LayoutMode.SIDE_BY_SIDE;
  }

  toRecord() {
    return {
      usernames: this.usernames,
      layoutMode: this.layoutMode,
    };
  }
}
