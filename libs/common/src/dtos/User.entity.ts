import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ConstructorType } from '../serializers/type';

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
  isOnline: boolean;

  @Expose()
  @ApiProperty()
  lastReportedAt: Date;

  constructor(data: ConstructorType<MachineUsageEntity>) {
    this.cpu = data.cpu;
    this.memory = data.memory;
    this.disk = data.disk;
    this.ping = data.ping;
    this.isOnline = data.isOnline;
    this.lastReportedAt = data.lastReportedAt;
  }
}

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

  @Expose()
  @ApiProperty()
  group: string;

  constructor(data: ConstructorType<UserEntity>) {
    this.username = data.username;
    this.fullName = data.fullName;
    this.isActive = data.isActive;
    this.vpnIpAddress = data.vpnIpAddress;
    this.role = data.role;
    this.machineUsage = new MachineUsageEntity(data.machineUsage);
    this.group = data.group;
  }
}
