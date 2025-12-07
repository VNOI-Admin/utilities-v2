import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum AddParticipantMode {
  EXISTING_USER = 'existing_user',
  CSV_IMPORT = 'csv_import',
  CREATE_USER = 'create_user',
  AUTO_CREATE_USER = 'auto_create_user', // Creates users with username=participant name, random password
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

  // AUTO_CREATE_USER mode does not require additional fields
  // It automatically finds all participants without a mapped user
}

export class GeneratedCredential {
  @ApiProperty({ description: 'Username of the created user' })
  username!: string;

  @ApiProperty({ description: 'Generated password for the user' })
  password!: string;
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

  @ApiProperty({
    description: 'Generated credentials for auto_create_user mode',
    type: [GeneratedCredential],
    required: false
  })
  generatedCredentials?: GeneratedCredential[];
}

export class RemoveParticipantDto {
  @ApiProperty({ description: 'Participant ID to remove' })
  @IsString()
  @IsNotEmpty()
  participantId!: string;
}
