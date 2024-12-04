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
}
