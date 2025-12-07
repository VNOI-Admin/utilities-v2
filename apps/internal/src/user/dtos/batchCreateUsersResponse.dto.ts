import { UserEntity } from '@libs/common/dtos/User.entity';
import { ApiProperty } from '@nestjs/swagger';

export class BatchUserResultDto {
  @ApiProperty({ description: 'Username that was processed' })
  username: string;

  @ApiProperty({ description: 'Whether the user was created successfully' })
  success: boolean;

  @ApiProperty({ required: false, description: 'Created user data (if success)' })
  user?: UserEntity;

  @ApiProperty({ required: false, description: 'Error message (if failed)' })
  error?: string;

  constructor(partial: Partial<BatchUserResultDto>) {
    this.username = partial.username ?? '';
    this.success = partial.success ?? false;
    this.user = partial.user;
    this.error = partial.error;
  }
}

export class BatchCreateUsersResponseDto {
  @ApiProperty({ description: 'Total number of users in the request' })
  total: number;

  @ApiProperty({ description: 'Number of successfully created users' })
  successCount: number;

  @ApiProperty({ description: 'Number of failed user creations' })
  failureCount: number;

  @ApiProperty({
    type: [BatchUserResultDto],
    description: 'Individual results for each user',
  })
  results: BatchUserResultDto[];

  @ApiProperty({
    type: [String],
    description: 'Groups that were auto-created during this batch operation',
  })
  autoCreatedGroups: string[];

  constructor(partial: Partial<BatchCreateUsersResponseDto>) {
    this.total = partial.total ?? 0;
    this.successCount = partial.successCount ?? 0;
    this.failureCount = partial.failureCount ?? 0;
    this.results = partial.results ?? [];
    this.autoCreatedGroups = partial.autoCreatedGroups ?? [];
  }
}
