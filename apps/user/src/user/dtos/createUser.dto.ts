import { Role } from "@libs/common/decorators";
import { ApiProperty } from "@nestjs/swagger";


export class CreateUserDto {
  @ApiProperty({ required: true })
  username: string;

  @ApiProperty({ required: true })
  fullName: string;

  @ApiProperty({ required: true })
  password: string;

  @ApiProperty({ required: true, enum: Object.values(Role), default: Role.CONTESTANT })
  role: Role;
}
