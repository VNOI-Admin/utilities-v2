import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength } from 'class-validator';

export class EnrollMachineDto {
  @ApiProperty({ description: 'Raw 32-byte Ed25519 public key, base64' })
  @IsString()
  @Matches(/^[A-Za-z0-9+/]{42}[AEIMQUYcgkosw048]=$/, { message: 'publicKey must be a base64 Ed25519 public key' })
  publicKey!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(64)
  hostname!: string;
}
