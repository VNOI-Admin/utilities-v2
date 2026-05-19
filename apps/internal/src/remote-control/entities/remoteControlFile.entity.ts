import { ConstructorType } from '@libs/common/serializers/type';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class RemoteControlFileEntity {
  @Expose()
  @ApiProperty()
  key: string;

  @Expose()
  @ApiProperty()
  filename: string;

  @Expose()
  @ApiProperty()
  size: number;

  @Expose()
  @ApiProperty()
  hash: string;

  constructor(data: ConstructorType<RemoteControlFileEntity>) {
    this.key = data.key;
    this.filename = data.filename;
    this.size = data.size;
    this.hash = data.hash;
  }
}
