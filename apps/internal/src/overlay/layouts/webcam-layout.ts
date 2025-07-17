import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ConstructorType } from '@libs/common/serializers/type';
import { OverlayLayout } from './generic';
import { OVERLAY_KEYS } from '@libs/common/types/overlay';

export const WEBCAM_LAYOUT_KEY = OVERLAY_KEYS.WEBCAM_LAYOUT;

export class WebcamLayout implements OverlayLayout {
  @Expose()
  @ApiProperty()
  enabled: boolean;

  constructor(data: ConstructorType<WebcamLayout>) {
    this.enabled = data.enabled;
  }

  toRecord() {
    return {
      enabled: this.enabled,
    };
  }
}
