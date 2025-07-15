import { Role } from '@libs/common/decorators/role.decorator';
import { ToBoolean } from '@libs/common/decorators/transform.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

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

  @ApiProperty({ required: false })
  @ToBoolean()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
