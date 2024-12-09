import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { ConstructorType } from '../serializers/type';

export class GroupEntity {
  @Expose()
  @ApiProperty()
  code: string;

  @Expose()
  @ApiProperty()
  name: string;

  constructor(data: ConstructorType<GroupEntity>) {
    this.code = data.code;
    this.name = data.name;
  }
}
