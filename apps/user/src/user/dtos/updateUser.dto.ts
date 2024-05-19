import { Role } from "@libs/common/decorators";
import { ApiProperty } from "@nestjs/swagger";


export class UpdateUserDto {
  @ApiProperty({ required: false })
  fullName: string;

  @ApiProperty({ required: false })
  password: string;

  @ApiProperty({ required: false })
  usernameNew: string;

  @ApiProperty({ required: false, enum: Object.values(Role), default: Role.CONTESTANT })
  role: Role;
}
