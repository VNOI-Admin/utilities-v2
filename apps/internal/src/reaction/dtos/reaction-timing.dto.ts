import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * One tunable field, as the settings page needs to render it: the effective
 * value plus the bounds the server will clamp to and where the value came from.
 */
export class ReactionTimingFieldDto {
  @ApiProperty({ description: 'Field name, matching the key in `values`' })
  key!: string;

  @ApiProperty({ description: 'Effective value after settings -> env -> default resolution' })
  value!: number;

  @ApiProperty({ description: 'Built-in default, used when neither a setting nor env is present' })
  default!: number;

  @ApiProperty()
  min!: number;

  @ApiProperty()
  max!: number;

  @ApiProperty({ description: 'Whole numbers only' })
  integer!: boolean;

  @ApiProperty({
    enum: ['setting', 'env', 'default'],
    description: 'Where the effective value came from, so the operator can see what env still controls',
  })
  source!: 'setting' | 'env' | 'default';

  @ApiPropertyOptional({ description: 'Env var consulted for this field, when one exists' })
  env?: string;
}

export class ReactionTimingResponseDto {
  @ApiProperty({
    description: 'Effective timing values, keyed by field name',
    additionalProperties: { type: 'number' },
  })
  values!: Record<string, number>;

  @ApiProperty({ type: [ReactionTimingFieldDto] })
  fields!: ReactionTimingFieldDto[];
}

export class UpdateReactionTimingDto {
  @ApiPropertyOptional({
    description:
      'Timing fields to store. Unknown keys are ignored; out-of-range values are clamped. ' +
      'Send null for a field to clear it and fall back to env/default.',
    additionalProperties: { type: 'number', nullable: true },
  })
  values?: Record<string, number | null>;
}
