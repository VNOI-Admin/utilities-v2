import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class RunFirewallProbeDto {
  @ApiProperty({ required: false, type: [String], description: 'Defaults to all eligible machines' })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  targets?: string[];
}

export class GetFirewallProbeResultsDto {
  @ApiProperty({ required: false, description: 'One machine; omitted returns the latest verdict per machine' })
  @IsOptional()
  @IsString()
  target?: string;

  @ApiProperty({ required: false, default: 20, description: 'History length, only used with target' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
