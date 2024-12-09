import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class MultiUserStreamDto {
  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  usernames!: string[];
}
