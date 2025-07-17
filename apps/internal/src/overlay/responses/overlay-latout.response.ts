import { ApiProperty } from "@nestjs/swagger";

export class OverlayLayoutResponse {
  @ApiProperty()
  key: string;

  @ApiProperty()
  data: object;

  @ApiProperty()
  current: boolean;

  constructor(data: OverlayLayoutResponse) {
    this.key = data.key;
    this.data = data.data;
    this.current = data.current;
  }
}
