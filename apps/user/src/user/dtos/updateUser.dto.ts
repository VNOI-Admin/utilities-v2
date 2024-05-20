import { Role } from "@libs/common/decorators";
import { ApiProperty } from "@nestjs/swagger";
import { IsOptional } from "class-validator";

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  fullName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  password: string;

  @ApiProperty({ required: false })
  @IsOptional()
  usernameNew: string;

  @ApiProperty({ required: false, enum: Object.values(Role), default: Role.CONTESTANT })
  @IsOptional()
  role: Role;
}
