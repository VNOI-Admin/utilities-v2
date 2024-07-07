import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class GroupEntity {
  @Expose()
  @ApiProperty()
  groupCodeName: string;

  @Expose()
  @ApiProperty()
  groupFullName: string;
}
