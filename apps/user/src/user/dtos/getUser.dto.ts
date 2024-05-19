import { ApiProperty } from "@nestjs/swagger";

export class GetUserDto {
  @ApiProperty({ required: false })
  q?: string;

  @ApiProperty({ required: false })
  role?: string;
}
