import { Role } from '@libs/common/decorators/role.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';

export class BatchUserItemDto {
  @ApiProperty({ required: true, description: 'Username for the new user' })
  @IsString()
  username!: string;

  @ApiProperty({ required: true, description: 'Full name of the user' })
  @IsString()
  fullName!: string;

  @ApiProperty({ required: true, description: 'Password for the user' })
  @IsString()
  password!: string;

  @ApiProperty({ required: false, description: 'Group name (will auto-create if not exists)' })
  @IsOptional()
  @IsString()
  groupName?: string;
}

export class BatchCreateUsersDto {
  @ApiProperty({
    required: true,
    enum: [Role.ADMIN, Role.COACH, Role.CONTESTANT],
    description: 'Role to assign to all users in the batch',
  })
  @IsEnum(Role)
  role!: Role.ADMIN | Role.COACH | Role.CONTESTANT;

  @ApiProperty({
    required: true,
    type: [BatchUserItemDto],
    description: 'Array of users to create (max 100 per batch)',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchUserItemDto)
  @ArrayMinSize(1)
  users!: BatchUserItemDto[];
}
