import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SubmissionStatus, type SubmissionDocument } from '@libs/common-db/schemas/submission.schema';

export class GetSubmissionsDto {
  @ApiProperty({ required: false, default: 1, description: 'Page number (1-indexed)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 100, description: 'Number of submissions per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 100;

  @ApiProperty({ required: false, description: 'Search by author or problem code' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ required: false, enum: SubmissionStatus, description: 'Filter by submission status' })
  @IsOptional()
  @IsEnum(SubmissionStatus)
  status?: SubmissionStatus;
}

export class PaginationMetadata {
  @ApiProperty({ description: 'Current page number' })
  page!: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit!: number;

  @ApiProperty({ description: 'Total number of items' })
  total!: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages!: number;
}

export class PaginatedSubmissionsResponse {
  @ApiProperty({ description: 'Array of submissions', type: [Object] })
  data!: SubmissionDocument[];

  @ApiProperty({ description: 'Pagination metadata', type: PaginationMetadata })
  pagination!: PaginationMetadata;
}
