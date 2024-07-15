import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";

export class VpnConfig {
  @Expose()
  @ApiProperty()
  readonly config: string;
}
