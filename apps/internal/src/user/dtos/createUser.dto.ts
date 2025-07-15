import { Role } from '@libs/common/decorators/role.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ required: true })
  @IsString()
  username!: string;

  @ApiProperty({ required: true })
  @IsString()
  fullName!: string;

  @ApiProperty({ required: true })
  @IsString()
  password!: string;

  @ApiProperty({ required: true, enum: Role, default: Role.CONTESTANT })
  @IsEnum(Role)
  role!: Role;
}
