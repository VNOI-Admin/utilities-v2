import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class SingleUserStreamDto {
  @ApiProperty()
  @IsString()
  username: string;
}
