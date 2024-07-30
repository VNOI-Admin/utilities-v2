import { Role } from "@libs/common/decorators/role.decorator";
import { SortDto } from "@libs/common/dtos/sort.dto";
import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";

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
}
