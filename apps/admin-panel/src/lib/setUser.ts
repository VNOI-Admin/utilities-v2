import type { Cookies } from "@sveltejs/kit";

export const setUser = (cookies: Cookies, accessToken: string, refreshToken: string) => {
  cookies.set("accessToken", accessToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: true,
    path: "/",
  });
  cookies.set("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: true,
    path: "/",
  });
};
