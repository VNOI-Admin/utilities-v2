import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreatePrintClientDto {
  @ApiProperty({ required: true })
  @IsString()
  clientId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  authKey: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive: boolean;
}
