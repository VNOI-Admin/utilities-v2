import { ConstructorType } from '@libs/common/serializers/type';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class PrintClientEntity {
  @Expose()
  @ApiProperty()
  clientId: string;

  @Expose()
  @ApiProperty()
  authKey: string;

  @Expose()
  @ApiProperty()
  isActive: boolean;

  @Expose()
  @ApiProperty()
  isOnline: boolean;

  @Expose()
  @ApiProperty()
  lastReportedAt: Date;

  constructor(data: ConstructorType<PrintClientEntity>) {
    this.clientId = data.clientId;
    this.authKey = data.authKey;
    this.isActive = data.isActive;
    this.isOnline = data.isOnline;
    this.lastReportedAt = data.lastReportedAt;
  }
}
