import { ConstructorType } from '@libs/common/serializers/type';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class VpnConfig {
  @Expose()
  @ApiProperty()
  readonly config: string;

  @Expose()
  @ApiProperty({
    required: false,
    nullable: true,
    description: 'VNOJ API key the machine injects as the Authorization bearer on the contest site proxy',
  })
  readonly apiKey: string | null;

  constructor(data: ConstructorType<VpnConfig>) {
    this.config = data.config;
    this.apiKey = data.apiKey ?? null;
  }
}
