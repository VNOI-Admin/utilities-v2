import { BadRequestException } from "@nestjs/common";
import { Transform } from "class-transformer";
import { compact, split } from "lodash";

export function TransformOrderBy() {
  return Transform(({ value }) => {
    const splitValue = split(value, ",");
    const arr = compact(splitValue);

    const t = arr.reduce(
      (a: Record<string, number>, b: string) => {
        const [key, value] = split(b, ":");
        if (value !== "1" && value !== "-1") {
          throw new BadRequestException("Invalid order_by value");
        }
        a[key] = parseInt(value);
        return a;
      },
      {} as Record<string, number>,
    );

    return t;
  });
}
