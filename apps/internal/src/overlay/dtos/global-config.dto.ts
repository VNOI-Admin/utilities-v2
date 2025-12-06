import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export enum FooterContentType {
  ANNOUNCEMENTS = 'announcements',
  RANKING = 'ranking',
}

export class GlobalConfigDto {
  @ApiProperty({ description: 'ID of the contest bound to this overlay' })
  @IsString()
  contestId!: string;

  @ApiProperty({ description: 'Show/hide all components (full view mode)' })
  @IsBoolean()
  fullViewMode!: boolean;

  @ApiProperty({ description: 'Show/hide submission queue' })
  @IsBoolean()
  showSubmissionQueue!: boolean;

  @ApiProperty({ description: 'Show/hide footer' })
  @IsBoolean()
  showFooter!: boolean;

  @ApiProperty({
    description: 'Type of content to display in footer',
    enum: FooterContentType,
  })
  @IsEnum(FooterContentType)
  footerContentType!: FooterContentType;

  @ApiProperty({ description: 'Current main view layout type (single, multi, or none)' })
  @IsString()
  currentLayout!: string;
}
