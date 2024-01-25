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
};

export class UserEntity {
  @Expose()
  @ApiProperty()
  username: string;

  @Expose()
  @ApiProperty()
  vpnIpAddress: string;

  @Expose()
  @ApiProperty()
  fullName: string;

  @Expose()
  @ApiProperty()
  role: string;

  @Expose()
  @ApiProperty()
  isActive: boolean;

  @Expose()
  @Type(() => MachineUsageEntity)
  @ApiProperty({ type: MachineUsageEntity })
  machineUsage: MachineUsageEntity;
}
