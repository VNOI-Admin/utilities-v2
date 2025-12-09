import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { WallOrientation } from '@libs/common-db/schemas/floorPlan.schema';

export class GridPositionDto {
  @ApiProperty()
  @IsInt()
  @Min(0)
  x!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  y!: number;
}

export class GridSizeDto {
  @ApiProperty({ default: 1 })
  @IsInt()
  @Min(1)
  width!: number;

  @ApiProperty({ default: 1 })
  @IsInt()
  @Min(1)
  height!: number;
}

export class CreateTableDto {
  @ApiProperty({ required: true })
  @IsString()
  label!: string;

  @ApiProperty({ required: true, type: GridPositionDto })
  @ValidateNested()
  @Type(() => GridPositionDto)
  position!: GridPositionDto;

  @ApiProperty({ required: false, type: GridSizeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GridSizeDto)
  size?: GridSizeDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  boundUsername?: string;
}

export class UpdateTableDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiProperty({ required: false, type: GridPositionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GridPositionDto)
  position?: GridPositionDto;

  @ApiProperty({ required: false, type: GridSizeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GridSizeDto)
  size?: GridSizeDto;
}

export class BindTableDto {
  @ApiProperty({ required: true })
  @IsString()
  username!: string;
}

export class CopyTableDto {
  @ApiProperty({ required: true, type: GridPositionDto })
  @ValidateNested()
  @Type(() => GridPositionDto)
  newPosition!: GridPositionDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  newLabel?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  boundUsername?: string;
}

export class CreateWallDto {
  @ApiProperty({ required: true, type: GridPositionDto })
  @ValidateNested()
  @Type(() => GridPositionDto)
  start!: GridPositionDto;

  @ApiProperty({ required: true })
  @IsInt()
  @Min(1)
  length!: number;

  @ApiProperty({ required: true, enum: WallOrientation })
  @IsEnum(WallOrientation)
  orientation!: WallOrientation;
}

export class UpdateWallDto {
  @ApiProperty({ required: false, type: GridPositionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GridPositionDto)
  start?: GridPositionDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  length?: number;

  @ApiProperty({ required: false, enum: WallOrientation })
  @IsOptional()
  @IsEnum(WallOrientation)
  orientation?: WallOrientation;
}

export class CreateCommentDto {
  @ApiProperty({ required: true })
  @IsString()
  text!: string;

  @ApiProperty({ required: true, type: GridPositionDto })
  @ValidateNested()
  @Type(() => GridPositionDto)
  position!: GridPositionDto;

  @ApiProperty({ required: false, type: GridSizeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GridSizeDto)
  size?: GridSizeDto;
}

export class UpdateCommentDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiProperty({ required: false, type: GridPositionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GridPositionDto)
  position?: GridPositionDto;

  @ApiProperty({ required: false, type: GridSizeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GridSizeDto)
  size?: GridSizeDto;
}
