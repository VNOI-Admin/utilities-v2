import { Role } from "@libs/common/decorators/role.decorator";
import { SortDto } from "@libs/common/dtos/sort.dto";
import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsString } from "class-validator";

export class GetUserDto extends SortDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({ required: false, enum: Object.values(Role) })
  @IsOptional()
  @IsEnum(Role)
  @IsString()
  role?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => {
    return Number(value);
  })
  skip: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => {
    return Number(value);
  })
  limit: number;
}
