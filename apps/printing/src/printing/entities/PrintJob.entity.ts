import { PrintStatus } from '@libs/common-db/schemas/printJob.schema';
import { UserEntity } from '@libs/common/dtos/User.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { Types } from 'mongoose';

export class PrintJobEntity {
  private _id: Types.ObjectId;

  @Expose()
  @ApiProperty()
  get id(): string {
    return this._id.toString();
  }

  @Expose()
  @ApiProperty()
  filename: string;

  user: UserEntity;

  @Expose()
  @ApiProperty()
  get username(): string {
    return this.user.username;
  }

  @Expose()
  @ApiProperty()
  clientId: string;

  @Expose()
  @ApiProperty()
  priority: number;

  @Expose()
  @ApiProperty()
  status: PrintStatus;

  @Expose()
  @ApiProperty()
  requestedAt: Date;
}
