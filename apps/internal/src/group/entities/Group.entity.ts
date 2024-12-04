import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class GroupEntity {
  @Expose()
  @ApiProperty()
  code: string;

  @Expose()
  @ApiProperty()
  fullName: string;
}
