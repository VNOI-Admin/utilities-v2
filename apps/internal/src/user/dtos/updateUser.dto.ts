import { Role } from '@libs/common/decorators/role.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({
    required: false,
    enum: Role,
    default: Role.CONTESTANT,
  })
  @IsOptional()
  @IsString()
  role?: Role;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  group?: string;
}
