import { ConstructorType } from '@libs/common/serializers/type';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class LuksRecoveryEntity {
  @Expose()
  @ApiProperty()
  id: string;

  @Expose()
  @ApiProperty()
  username: string;

  @Expose()
  @ApiProperty()
  recoveryPassphrase: string;

  @Expose()
  @ApiProperty({ required: false, nullable: true })
  escrowedAt: Date | null;

  @Expose()
  @ApiProperty({ required: false, nullable: true })
  updatedAt: Date | null;

  constructor(data: ConstructorType<LuksRecoveryEntity> & { _id?: any }) {
    this.id = data.id ?? data._id?.toString();
    this.username = data.username;
    this.recoveryPassphrase = data.recoveryPassphrase;
    this.escrowedAt = data.escrowedAt ?? null;
    this.updatedAt = data.updatedAt ?? null;
  }
}
