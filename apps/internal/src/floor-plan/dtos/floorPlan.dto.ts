import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { GridPositionDto } from './common.dto';

export class CreateFloorPlanDto {
  @ApiProperty({ required: true })
  @IsString()
  code!: string;

  @ApiProperty({ required: true })
  @IsString()
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFloorPlanDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateFloorDto {
  @ApiProperty({ required: true })
  @IsString()
  name!: string;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  gridWidth?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  gridHeight?: number;

  @ApiProperty({ required: false, type: GridPositionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GridPositionDto)
  startingPoint?: GridPositionDto;
}

export class UpdateFloorDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  gridWidth?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  gridHeight?: number;

  @ApiProperty({ required: false, type: GridPositionDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GridPositionDto)
  startingPoint?: GridPositionDto;
}
