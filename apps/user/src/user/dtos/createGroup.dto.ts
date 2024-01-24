import { ApiProperty } from "@nestjs/swagger";

export class CreateGroupDto {
  @ApiProperty({ required: true })
  groupCodeName: string;

  @ApiProperty({ required: true })
  groupFullName: string;
}
