import { PrintStatus } from '@libs/common-db/schemas/printJob.schema';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdatePrintJobDto {
  @ApiProperty({
    required: false,
    enum: Object.values(PrintStatus),
    default: PrintStatus.QUEUED,
  })
  @IsOptional()
  status: PrintStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  username: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  filename: string;
}
