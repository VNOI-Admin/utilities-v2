import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl } from 'class-validator';
import { ConstructorType } from '@libs/common/serializers/type';
import { OverlayLayout } from './generic';
import { OVERLAY_KEYS } from '@libs/common/types/overlay';

export const USER_STREAM_KEY = OVERLAY_KEYS.USER_STREAM;

export class UserStream implements OverlayLayout {
  @Expose()
  @ApiProperty()
  @IsString()
  username: string;

  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  streamUrl?: string;

  @Expose()
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  webcamUrl?: string;

  constructor(data: ConstructorType<UserStream>) {
    this.username = data.username;
    this.streamUrl = data.streamUrl;
    this.webcamUrl = data.webcamUrl;
  }

  toRecord() {
    return {
      username: this.username,
      streamUrl: this.streamUrl,
      webcamUrl: this.webcamUrl,
    };
  }
}
