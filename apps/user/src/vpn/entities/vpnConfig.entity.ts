import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class VpnConfig {
  @Expose()
  @ApiProperty()
  readonly config: string;
}
