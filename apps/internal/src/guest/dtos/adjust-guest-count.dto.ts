import { IsInt, Min } from 'class-validator';

export class AdjustGuestCountDto {
  @IsInt()
  @Min(0)
  targetCount!: number;
}
