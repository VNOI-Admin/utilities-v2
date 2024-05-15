import { Role } from "@libs/common-db/user.schema";
import { ApiProperty } from "@nestjs/swagger";


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

export class CreateUserBatchDto {
  @ApiProperty({ type: [CreateUserDto] })
  users: CreateUserDto[];
}
