import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RenameMachineDto {
  @ApiProperty({ description: '1-32 characters, trimmed; unique across machines', example: 'room-a-01' })
  @IsString()
  name!: string;
}
