import { ApiProperty } from "@nestjs/swagger";

import { Role } from "../../database/schema/user.schema";

export class CreateUserDto {
  @ApiProperty({ required: true })
  username: string;

  @ApiProperty({ required: true })
  fullName: string;

  @ApiProperty({ required: true })
  password: string;

  @ApiProperty({ required: true, enum: ['admin', 'coach', 'user'], default: 'user' })
  role: Role;
}
