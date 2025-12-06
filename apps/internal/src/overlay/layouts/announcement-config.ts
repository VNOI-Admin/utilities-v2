import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ConstructorType } from '@libs/common/serializers/type';
import { OverlayLayout } from './generic';
import { OVERLAY_KEYS } from '@libs/common/types/overlay';
import { AnnouncementItem } from '../dtos/announcement.dto';

export const ANNOUNCEMENTS_KEY = OVERLAY_KEYS.ANNOUNCEMENTS;

export class AnnouncementConfig implements OverlayLayout {
  @Expose()
  @ApiProperty({ type: [AnnouncementItem] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnnouncementItem)
  announcements: AnnouncementItem[];

  constructor(data: ConstructorType<AnnouncementConfig>) {
    this.announcements = data.announcements || [];
  }

  toRecord() {
    return {
      announcements: this.announcements,
    };
  }
}
