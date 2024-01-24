import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class UserEntity {
  @Expose()
  @ApiProperty()
  username: string;

  @Expose()
  @ApiProperty()
  fullName: string;

  @Expose()
  @ApiProperty()
  isActive: boolean;

  @Expose()
  @ApiProperty()
  vpnIpAddress: string;
}
