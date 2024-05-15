import { Role } from "@libs/common-db/user.schema";
import { ApiProperty } from "@nestjs/swagger";


export class UpdateUserDto {
  @ApiProperty({ required: true })
  username: string;

  @ApiProperty({ required: false })
  fullName: string;

  @ApiProperty({ required: false })
  password: string;

  @ApiProperty({ required: false })
  usernameNew: string;

  @ApiProperty({ required: false, enum: ['admin', 'coach', 'user'], default: 'user' })
  role: Role;
}

export class UpdateUserBatchDto {
  @ApiProperty({ type: [UpdateUserDto] })
  users: UpdateUserDto[];
}
