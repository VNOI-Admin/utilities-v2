import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class AnnouncementItem {
  @ApiProperty({ description: 'Unique ID for this announcement' })
  @IsString()
  id!: string;

  @ApiProperty({ description: 'Announcement text content' })
  @IsString()
  text!: string;

  @ApiProperty({ description: 'Priority level (higher shows first)', default: 0 })
  @IsNumber()
  @IsOptional()
  priority?: number;

  @ApiProperty({ description: 'Timestamp when announcement was created' })
  @IsNumber()
  timestamp!: number;
}

export class AnnouncementConfigDto {
  @ApiProperty({
    description: 'Array of announcements',
    type: [AnnouncementItem],
  })
  @IsArray()
  announcements!: AnnouncementItem[];
}
