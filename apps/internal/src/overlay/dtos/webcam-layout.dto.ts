import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class WebcamLayoutDto {
  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;
}
