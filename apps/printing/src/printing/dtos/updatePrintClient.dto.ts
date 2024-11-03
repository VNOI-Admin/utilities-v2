import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdatePrintClientDto {
  @ApiProperty({ required: false })
  @IsOptional()
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
