import { ConstructorType } from '@libs/common/serializers/type';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class RemoteJobEntity {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  scriptName: string;

  @Expose()
  @ApiProperty()
  scriptHash: string;

  @Expose()
  @ApiProperty({ type: [String] })
  args: string[];

  @Expose()
  @ApiProperty({ type: Object })
  env: Record<string, string>;

  @Expose()
  @ApiProperty()
  createdBy: string;

  @Expose()
  @ApiProperty()
  createdAt: Date;

  @Expose()
  @ApiProperty({ type: [String] })
  targets: string[];

  constructor(data: ConstructorType<RemoteJobEntity> & { _id?: any }) {
    this.id = data.id ?? data._id?.toString();
    this.scriptName = data.scriptName;
    this.scriptHash = data.scriptHash;
    this.args = data.args;
    this.env = data.env;
    this.createdBy = data.createdBy;
    this.createdAt = data.createdAt;
    this.targets = data.targets;
  }
}

