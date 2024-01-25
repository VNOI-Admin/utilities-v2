import { ApiProperty } from "@nestjs/swagger";

export class ReportUsageDto {
  @ApiProperty({ required: true })
  cpu: number;

  @ApiProperty({ required: true })
  memory: number;

  @ApiProperty({ required: true })
  disk: number;
}
