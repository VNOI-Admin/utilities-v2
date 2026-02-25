import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsObject, IsOptional, Max, Min } from 'class-validator';

import { TransformOrderBy } from '../decorators/transformOrderBy.decorator';

export class SortDto {
  @ApiProperty({
    required: false,
    type: String,
    description: 'Sort by field, 1 for ascending, -1 for descending. Example: key1:1,key2:-1',
  })
  @TransformOrderBy()
  @IsOptional()
  @IsObject()
  orderBy?: Record<string, 1 | -1>;
}

export class PaginatedSortDto extends SortDto {
  @ApiProperty({
    required: false,
    default: 50,
    description: 'Max items to return (1-200)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;

  @ApiProperty({
    required: false,
    default: 0,
    description: 'Number of items to skip',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;
}
