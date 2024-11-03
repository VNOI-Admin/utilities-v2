import { PrintStatus } from '@libs/common-db/schemas/printJob.schema';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdatePrintJobDto {
  @ApiProperty({
    required: false,
    enum: Object.values(PrintStatus),
  })
  @IsOptional()
  @IsEnum(PrintStatus)
  status: PrintStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  username: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clientId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  priority: number;
}
