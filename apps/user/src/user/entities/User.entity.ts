import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

export class MachineUsageEntity {
  @Expose()
  @ApiProperty()
  cpu: number;

  @Expose()
  @ApiProperty()
  memory: number;

  @Expose()
  @ApiProperty()
  disk: number;

  @Expose()
  @ApiProperty()
  ping: number;

  @Expose()
  @ApiProperty()
  lastReportedAt: Date;
};

export class UserEntity {
  @Expose()
  @ApiProperty()
  username: string;

  @Expose()
  @ApiProperty()
  fullName: string;

  @Expose()
  @ApiProperty()
  isActive: boolean;

  @Expose()
  @ApiProperty()
  vpnIpAddress: string;

  @Expose()
  @ApiProperty()
  role: string;

  @Expose()
  @Type(() => MachineUsageEntity)
  @ApiProperty({ type: MachineUsageEntity })
  machineUsage: MachineUsageEntity;
}
