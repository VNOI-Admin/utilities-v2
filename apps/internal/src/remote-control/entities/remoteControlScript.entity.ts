import { ConstructorType } from '@libs/common/serializers/type';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class RemoteControlScriptSummaryEntity {
  @Expose()
  @ApiProperty()
  name: string;

  @Expose()
  @ApiProperty()
  hash: string;

  @Expose()
  @ApiProperty()
  createdAt: Date;

  @Expose()
  @ApiProperty()
  updatedAt: Date;

  constructor(data: ConstructorType<RemoteControlScriptSummaryEntity>) {
    this.name = data.name;
    this.hash = data.hash;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}

export class RemoteControlScriptEntity extends RemoteControlScriptSummaryEntity {
  @Expose()
  @ApiProperty()
  content: string;

  constructor(data: ConstructorType<RemoteControlScriptEntity>) {
    super(data);
    this.content = data.content;
  }
}

