import { ApiProperty } from "@nestjs/swagger";
import { IsObject, IsOptional } from "class-validator";

import { TransformOrderBy } from "../decorators/transformOrderBy.decorator";

export class SortDto {
  @ApiProperty({
    required: false,
    type: String,
    description:
      "Sort by field, 1 for ascending, -1 for descending. Example: key1:1,key2:-1",
  })
  @TransformOrderBy()
  @IsOptional()
  @IsObject()
  orderBy?: Record<string, 1 | -1>;
}
