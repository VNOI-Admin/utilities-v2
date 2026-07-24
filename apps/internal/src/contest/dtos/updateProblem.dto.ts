import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Max, Min, ValidateIf } from 'class-validator';

export class UpdateProblemDto {
  @ApiProperty({
    required: false,
    description:
      'Manual display name shown in place of the problem code everywhere the problem appears. Pass an empty string to clear the override.',
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description:
      'Assumed judging runtime in seconds. `judgedAt` is when judging started, so the reaction reveal is anchored to ' +
      '`judgedAt + assumedRuntimeSeconds + buffer`. Pass null to clear the override (treated as 0).',
  })
  @IsOptional()
  // Explicit null clears the value; only validate the numeric range otherwise.
  @ValidateIf((_, value) => value !== null)
  @IsNumber()
  @Min(0)
  @Max(3600)
  assumedRuntimeSeconds?: number | null;
}
