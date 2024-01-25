import type { COLOR_SCHEMES } from "./constants";

export type ColorScheme = (typeof COLOR_SCHEMES)[number];

export interface User {
  accessToken: string;
  refreshToken: string;
}
