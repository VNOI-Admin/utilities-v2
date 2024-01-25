import type { Cookies } from "@sveltejs/kit";

export const setUser = (cookies: Cookies, accessToken: string, refreshToken: string) => {
  cookies.set("accessToken", accessToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: true,
    path: "/",
    maxAge: 24 * 60 * 60,
  });
  cookies.set("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: true,
    path: "/",
    maxAge: 24 * 60 * 60,
  });
};
