import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import { ConstructorType } from '@libs/common/serializers/type';
import { OverlayLayout } from './generic';
import { OVERLAY_KEYS } from '@libs/common/types/overlay';

export const RANKING_KEY = OVERLAY_KEYS.RANKING;

export class RankingConfig implements OverlayLayout {
  @Expose()
  @ApiProperty({ description: 'Current page/section (0-indexed)', default: 0 })
  @IsNumber()
  @Min(0)
  currentPage: number;

  constructor(data: ConstructorType<RankingConfig>) {
    this.currentPage = data.currentPage ?? 0;
  }

  toRecord() {
    return {
      currentPage: this.currentPage,
    };
  }
}
