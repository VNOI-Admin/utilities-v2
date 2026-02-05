import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class UpdateRemoteControlScriptDto {
  @ApiProperty({ required: true, description: 'Script content' })
  @IsString()
  @MaxLength(5_000_000)
  content!: string;
}
