import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateContestDto {
  @ApiProperty({ description: 'Contest code from VNOJ (e.g., vnoicup25_r2)' })
  @IsString()
  code!: string;
}
