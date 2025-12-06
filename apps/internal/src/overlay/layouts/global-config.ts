import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsString } from 'class-validator';
import { ConstructorType } from '@libs/common/serializers/type';
import { OverlayLayout } from './generic';
import { OVERLAY_KEYS } from '@libs/common/types/overlay';
import { FooterContentType } from '../dtos/global-config.dto';

export const GLOBAL_CONFIG_KEY = OVERLAY_KEYS.GLOBAL_CONFIG;

export class GlobalConfig implements OverlayLayout {
  @Expose()
  @ApiProperty()
  @IsString()
  contestId: string;

  @Expose()
  @ApiProperty()
  @IsBoolean()
  fullViewMode: boolean;

  @Expose()
  @ApiProperty()
  @IsBoolean()
  showSubmissionQueue: boolean;

  @Expose()
  @ApiProperty()
  @IsBoolean()
  showFooter: boolean;

  @Expose()
  @ApiProperty({ enum: FooterContentType })
  @IsEnum(FooterContentType)
  footerContentType: FooterContentType;

  @Expose()
  @ApiProperty()
  @IsString()
  currentLayout: string;

  constructor(data: ConstructorType<GlobalConfig>) {
    this.contestId = data.contestId;
    this.fullViewMode = data.fullViewMode;
    this.showSubmissionQueue = data.showSubmissionQueue;
    this.showFooter = data.showFooter;
    this.footerContentType = data.footerContentType;
    this.currentLayout = data.currentLayout;
  }

  toRecord() {
    return {
      contestId: this.contestId,
      fullViewMode: this.fullViewMode,
      showSubmissionQueue: this.showSubmissionQueue,
      showFooter: this.showFooter,
      footerContentType: this.footerContentType,
      currentLayout: this.currentLayout,
    };
  }
}
