import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateProblemDto {
  @ApiProperty({
    required: false,
    description:
      'Manual display name shown in place of the problem code everywhere the problem appears. Pass an empty string to clear the override.',
  })
  @IsOptional()
  @IsString()
  displayName?: string;
}
