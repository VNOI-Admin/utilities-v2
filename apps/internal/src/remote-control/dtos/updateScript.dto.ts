import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateRemoteControlScriptDto {
  @ApiProperty({ required: true })
  @IsString()
  content!: string;
}

