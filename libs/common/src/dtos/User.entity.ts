import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { roleHasVpn } from '../helper/vpn';
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
  @ApiProperty({ required: false })
  lastReportedAt?: Date;

  constructor(data?: Partial<ConstructorType<MachineUsageEntity>>) {
    this.cpu = data?.cpu ?? 0;
    this.memory = data?.memory ?? 0;
    this.disk = data?.disk ?? 0;
    this.ping = data?.ping ?? 0;
    this.isOnline = data?.isOnline ?? false;
    this.lastReportedAt = data?.lastReportedAt;
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
  @ApiProperty({ required: false, nullable: true })
  vpnIpAddress: string | null;

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

  @Expose()
  @ApiProperty({ required: false })
  streamUrl?: string;

  @Expose()
  @ApiProperty({ required: false })
  webcamUrl?: string;

  constructor(data: ConstructorType<UserEntity>) {
    this.username = data.username;
    this.fullName = data.fullName;
    this.isActive = data.isActive;
    this.vpnIpAddress = roleHasVpn(data.role) ? (data.vpnIpAddress ?? null) : null;
    this.role = data.role;
    this.machineUsage = new MachineUsageEntity(data.machineUsage);
    this.group = data.group;
    this.streamUrl = roleHasVpn(data.role) ? data.streamUrl : undefined;
    this.webcamUrl = roleHasVpn(data.role) ? data.webcamUrl : undefined;
  }
}
