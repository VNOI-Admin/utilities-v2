import { Role } from '@libs/common/decorators/role.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class BulkDeleteUsersDto {
  @ApiProperty({
    required: true,
    description: 'Text query to filter users by username or fullName (required to prevent accidental mass deletion)',
    minLength: 1,
  })
  @IsString()
  @MinLength(1)
  q!: string;

  @ApiProperty({ required: false, enum: Role, description: 'Filter by role' })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({ required: false, description: 'Filter by group code' })
  @IsOptional()
  @IsString()
  group?: string;

  @ApiProperty({ required: false, description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BulkDeleteUsersResponseDto {
  @ApiProperty({ description: 'Number of users deleted' })
  deletedCount: number;

  @ApiProperty({ description: 'Usernames of deleted users', type: [String] })
  deletedUsernames: string[];

  constructor(partial: Partial<BulkDeleteUsersResponseDto>) {
    this.deletedCount = partial.deletedCount ?? 0;
    this.deletedUsernames = partial.deletedUsernames ?? [];
  }
}
