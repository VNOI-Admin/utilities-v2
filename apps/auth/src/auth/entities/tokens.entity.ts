import { ConstructorType } from '@libs/common/serializers/type';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class TokensEntity {
  @Expose()
  @ApiProperty()
  accessToken: string;

  @Expose()
  @ApiProperty()
  refreshToken: string;

  constructor(data: ConstructorType<TokensEntity>) {
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
  }
}
