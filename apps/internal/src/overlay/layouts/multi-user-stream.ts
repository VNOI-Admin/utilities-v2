import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { ConstructorType } from '@libs/common/serializers/type';
import { UserStream } from './user-stream';
import { OverlayLayout } from './generic';
import { OVERLAY_KEYS } from '@libs/common/types/overlay';

export const MULTI_USER_STREAM_KEY = OVERLAY_KEYS.MULTI_USER_STREAM;

export class MultiUserStream implements OverlayLayout {
  @Expose()
  @ApiProperty()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserStream)
  users: UserStream[] | ConstructorType<UserStream>[];

  constructor(data: ConstructorType<MultiUserStream>) {
    this.users = data.users;
  }

  toRecord(): ConstructorType<MultiUserStream> {
    return {
      users: this.users.map((user) => user.toRecord()),
    };
  }
}
