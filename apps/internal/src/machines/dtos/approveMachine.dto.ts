import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class ApproveMachineDto {
  @ApiProperty({ description: 'Code shown on the machine, e.g. ABCDE-12345', example: 'ABCDE-12345' })
  @IsString()
  @MaxLength(32)
  code!: string;
}
