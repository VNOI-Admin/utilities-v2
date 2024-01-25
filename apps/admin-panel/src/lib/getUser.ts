import type { Cookies } from "@sveltejs/kit";

import type { User } from "./types";

export const getUser = (cookies: Cookies): User | undefined => {
  const accessToken = cookies.get("accessToken");
  const refreshToken = cookies.get("refreshToken");

  if (accessToken === undefined || refreshToken === undefined) {
    return undefined;
  }

  return {
    accessToken,
    refreshToken,
  };
};
