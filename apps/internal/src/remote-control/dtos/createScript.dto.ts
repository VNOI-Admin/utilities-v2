import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateRemoteControlScriptDto {
  @ApiProperty({ required: true })
  @IsString()
  name!: string;

  @ApiProperty({ required: true })
  @IsString()
  content!: string;
}

