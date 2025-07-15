import { ConstructorType } from '@libs/common/serializers/type';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class VpnConfig {
  @Expose()
  @ApiProperty()
  readonly config: string;

  constructor(data: ConstructorType<VpnConfig>) {
    this.config = data.config;
  }
}
