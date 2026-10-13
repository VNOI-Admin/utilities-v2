import { Role } from '@libs/common/decorators/role.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsBoolean, Matches } from 'class-validator';

// What VNOJ's APIMiddleware accepts: 'Bearer ([a-zA-Z0-9_-]{48})'.
export const API_KEY_PATTERN = /^[A-Za-z0-9_-]{48}$/;

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

  @ApiProperty({
    required: false,
    description: 'VNOJ API key (48 chars, base64url alphabet) used to sign the contestant into the judge',
  })
  @IsOptional()
  @Matches(API_KEY_PATTERN, { message: 'apiKey must be a 48-character VNOJ API key' })
  apiKey?: string;

  @ApiProperty({ required: true, enum: Role, default: Role.CONTESTANT })
  @IsEnum(Role)
  role!: Role;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive: boolean = true;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  group?: string;
}
