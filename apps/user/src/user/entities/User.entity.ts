import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class UserEntity {
  @Expose()
  @ApiProperty()
  username: string;

  @Expose()
  @ApiProperty()
  vpnIpAddress: string;
}
