import { ConstructorType } from '@libs/common/serializers/type';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class RemoteJobCancelResultEntity {
  @Expose()
  @ApiProperty()
  target: string;

  @Expose()
  @ApiProperty()
  accepted: boolean;

  @Expose()
  @ApiProperty()
  message: string;

  constructor(data: ConstructorType<RemoteJobCancelResultEntity>) {
    this.target = data.target;
    this.accepted = data.accepted;
    this.message = data.message;
  }
}

export class RemoteJobCancelResponseEntity {
  @Expose()
  @ApiProperty()
  jobId: string;

  @Expose()
  @ApiProperty({ type: [RemoteJobCancelResultEntity] })
  results: RemoteJobCancelResultEntity[];

  constructor(
    data: ConstructorType<RemoteJobCancelResponseEntity> & { results: ConstructorType<RemoteJobCancelResultEntity>[] },
  ) {
    this.jobId = data.jobId;
    this.results = data.results.map((result) => new RemoteJobCancelResultEntity(result));
  }
}
