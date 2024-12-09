import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({ required: true })
  @IsString()
  code!: string;

  @ApiProperty({ required: true })
  @IsString()
  name!: string;
}
