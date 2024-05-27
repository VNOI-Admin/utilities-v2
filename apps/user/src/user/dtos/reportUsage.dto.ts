import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class ReportUsageDto {
  @ApiProperty({ required: true })
  @IsNumber()
  cpu: number;

  @ApiProperty({ required: true })
  @IsNumber()
  memory: number;

  @ApiProperty({ required: true })
  @IsNumber()
  disk: number;
}
