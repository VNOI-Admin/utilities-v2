import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitLuksRecoveryDto {
  @ApiProperty({ description: 'Contents of /root/luks-recovery (single line, trailing newline optional)' })
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  recoveryPassphrase!: string;
}
