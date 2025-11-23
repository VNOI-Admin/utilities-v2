import { PrintStatus } from '@libs/common-db/schemas/printJob.schema';
import { ConstructorType } from '@libs/common/serializers/type';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class PrintJobEntity {
  @Expose()
  @ApiProperty()
  jobId: string;

  @Expose()
  @ApiProperty()
  filename: string;

  @Expose()
  @ApiProperty()
  username: string;

  @Expose()
  @ApiProperty()
  clientId: string;

  @Expose()
  @ApiProperty()
  priority: number;

  @Expose()
  @ApiProperty()
  status: PrintStatus;

  @Expose()
  @ApiProperty()
  requestedAt: Date;

  constructor(data: ConstructorType<PrintJobEntity>) {
    this.jobId = data.jobId;
    this.filename = data.filename;
    this.username = data.username;
    this.clientId = data.clientId;
    this.priority = data.priority;
    this.status = data.status;
    this.requestedAt = data.requestedAt;
  }
}
