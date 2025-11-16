import { Role } from '@libs/common/decorators/role.decorator';
import { ToBoolean } from '@libs/common/decorators/transform.decorator';
import { SortDto } from '@libs/common/dtos/sort.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import _ from 'lodash';

export class GetUsersDto extends SortDto {
  @ApiProperty({ required: false, description: 'Search query' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({ required: false, enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiProperty({ required: false, description: 'Return current user based on access token' })
  @ToBoolean()
  @IsOptional()
  @IsBoolean()
  me?: boolean;

  @ApiProperty({ required: false, description: 'Return only active users. Default is true.', default: true })
  @ToBoolean()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false, description: 'Return only online users' })
  @ToBoolean()
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @ApiProperty({ required: false, description: 'Include stream URLs (streamUrl and webcamUrl) in response', default: false })
  @ToBoolean()
  @IsOptional()
  @IsBoolean()
  withStream?: boolean;
}
