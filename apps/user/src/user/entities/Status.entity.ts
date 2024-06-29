import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class StatusEntity {
  @Expose()
  @ApiProperty()
  success: boolean;

  @Expose()
  @ApiProperty()
  message: string;
}
