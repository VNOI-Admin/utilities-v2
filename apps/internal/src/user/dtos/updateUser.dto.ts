import { Role } from '@libs/common/decorators/role.decorator';
import { ToBoolean } from '@libs/common/decorators/transform.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

import { API_KEY_PATTERN } from './createUser.dto';

export class UpdateUserDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Matches(API_KEY_PATTERN, { message: 'apiKey must be a 48-character VNOJ API key' })
  apiKey?: string;

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
