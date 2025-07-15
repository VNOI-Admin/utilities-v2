import { PrintStatus } from '@libs/common-db/schemas/printJob.schema';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export class UpdatePrintJobStatusDto {
  @ApiProperty({
    required: true,
    enum: Object.values(PrintStatus),
  })
  @IsEnum(PrintStatus)
  status!: PrintStatus;
}
