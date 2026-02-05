import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

export class CreateRemoteControlScriptDto {
  @ApiProperty({
    required: true,
    description: 'Script name (alphanumeric, hyphens, underscores only, max 64 chars)',
    example: 'my-script_v1',
  })
  @IsString()
  @MaxLength(64)
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Script name can only contain letters, numbers, hyphens, and underscores',
  })
  name!: string;

  @ApiProperty({ required: true, description: 'Script content' })
  @IsString()
  @MaxLength(5_000_000)
  content!: string;
}
