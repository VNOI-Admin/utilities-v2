import { RemoteJobRunStatus } from '@libs/common-db/schemas/remoteJobRun.schema';
import { ConstructorType } from '@libs/common/serializers/type';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class RemoteJobRunEntity {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  jobId: string;

  @Expose()
  @ApiProperty()
  target: string;

  @Expose()
  @ApiProperty({ enum: RemoteJobRunStatus })
  status: RemoteJobRunStatus;

  @Expose()
  @ApiProperty({ required: false, nullable: true })
  exitCode: number | null;

  @Expose()
  @ApiProperty({ required: false, nullable: true })
  log: string | null;

  @Expose()
  @ApiProperty()
  updatedAt: Date;

  constructor(data: ConstructorType<RemoteJobRunEntity> & { _id?: any }) {
    this.id = data.id ?? data._id?.toString();
    this.jobId = data.jobId;
    this.target = data.target;
    this.status = data.status;
    this.exitCode = data.exitCode ?? null;
    this.log = data.log ?? null;
    this.updatedAt = data.updatedAt;
  }
}
