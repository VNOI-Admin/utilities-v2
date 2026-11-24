import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsObject, IsString } from 'class-validator';

export class BroadcastStateDto {
  @ApiProperty()
  @IsString()
  contestId!: string;

  @ApiProperty({ type: 'object' })
  @IsObject()
  widgets!: Record<string, unknown>;

  @ApiProperty({ type: 'array', items: { type: 'object' } })
  @IsArray()
  ticker!: Record<string, unknown>[];

  @ApiProperty({ type: 'object' })
  @IsObject()
  visual!: Record<string, unknown>;

  @ApiProperty({ type: 'object' })
  @IsObject()
  medals!: Record<string, number>;
}
