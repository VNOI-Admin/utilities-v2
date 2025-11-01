import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class LinkParticipantDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  user?: string;
}
