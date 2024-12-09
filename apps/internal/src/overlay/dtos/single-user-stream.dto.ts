import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class SingleUserStreamDto {
  @ApiProperty()
  @IsString()
  username!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  webcam?: boolean;
}
