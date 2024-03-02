import { ApiProperty } from "@nestjs/swagger";

import { Role } from "../../database/schema/user.schema";

export class UpdateUserDto {
  @ApiProperty({ required: true })
  username: string;

  @ApiProperty({ required: false })
  fullName: string;

  @ApiProperty({ required: false })
  password: string;

  @ApiProperty({ required: false })
  usernameNew: string;

  @ApiProperty({ required: false })
  isActive: boolean;

  @ApiProperty({ required: false, enum: ['admin', 'coach', 'user'], default: 'user' })
  role: Role;
}

export class UpdateUserBatchDto {
  @ApiProperty({ type: [UpdateUserDto] })
  users: UpdateUserDto[];
}
