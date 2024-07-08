import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { GroupEntity } from '../../group/entities/Group.entity';

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
  // exclude values that does not contain groupCodeName
  @Transform((group) => group.value?.groupCodeName && group.value)
  @Type(() => GroupEntity)
  @ApiProperty({ type: GroupEntity })
  group: GroupEntity;
}
