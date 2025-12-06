import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum LayoutMode {
  SIDE_BY_SIDE = 'side_by_side',
  QUAD = 'quad',
}

export class MultiContestantConfigDto {
  @ApiProperty({
    description: 'Array of usernames (max 4)',
    type: [String],
    maxLength: 4,
  })
  @IsArray()
  @IsString({ each: true })
  usernames!: string[];

  @ApiProperty({
    description: 'Layout mode for displaying multiple contestants',
    enum: LayoutMode,
    default: LayoutMode.SIDE_BY_SIDE,
  })
  @IsEnum(LayoutMode)
  @IsOptional()
  layoutMode?: LayoutMode;
}
