import { ConstructorType } from '@libs/common/serializers/type';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { RemoteJobRunEntity } from './remoteJobRun.entity';

export class RemoteJobRefreshSyncResponseEntity {
  @Expose()
  @ApiProperty()
  jobId: string;

  @Expose()
  @ApiProperty({ type: [RemoteJobRunEntity] })
  runs: RemoteJobRunEntity[];

  constructor(data: ConstructorType<RemoteJobRefreshSyncResponseEntity>) {
    this.jobId = data.jobId;
    this.runs = data.runs;
  }
}

