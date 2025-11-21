import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum AddParticipantMode {
  EXISTING_USER = 'existing_user',
  CSV_IMPORT = 'csv_import',
  CREATE_USER = 'create_user',
}

export class AddParticipantDto {
  @ApiProperty({
    enum: AddParticipantMode,
    description: 'Mode for adding participant'
  })
  @IsEnum(AddParticipantMode)
  @IsNotEmpty()
  mode!: AddParticipantMode;

  // For EXISTING_USER mode
  @ApiProperty({
    required: false,
    description: 'Participant username (VNOJ username) - required for existing_user and create_user modes'
  })
  @IsOptional()
  @IsString()
  participantUsername?: string;

  @ApiProperty({
    required: false,
    description: 'User ID to link to - required for existing_user mode'
  })
  @IsOptional()
  @IsString()
  userId?: string;

  // For CSV_IMPORT mode
  @ApiProperty({
    required: false,
    description: 'CSV string with format: participant_username,backend_username (one per line) - required for csv_import mode'
  })
  @IsOptional()
  @IsString()
  csvData?: string;

  // For CREATE_USER mode
  @ApiProperty({
    required: false,
    description: 'Full name for new user - required for create_user mode'
  })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiProperty({
    required: false,
    description: 'Backend username for new user - required for create_user mode'
  })
  @IsOptional()
  @IsString()
  backendUsername?: string;

  @ApiProperty({
    required: false,
    description: 'Password for new user - required for create_user mode'
  })
  @IsOptional()
  @IsString()
  password?: string;
}

export class AddParticipantResponseDto {
  @ApiProperty({ description: 'Number of participants successfully added' })
  added!: number;

  @ApiProperty({ description: 'Number of participants that were skipped (already exist)' })
  skipped!: number;

  @ApiProperty({ description: 'Total number of participants processed' })
  total!: number;

  @ApiProperty({
    description: 'Array of errors that occurred during processing',
    type: [String]
  })
  errors!: string[];
}

export class RemoveParticipantDto {
  @ApiProperty({ description: 'Participant ID to remove' })
  @IsString()
  @IsNotEmpty()
  participantId!: string;
}
