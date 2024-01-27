import type { Cookies } from "@sveltejs/kit";

import { USER_SERVICE_URI } from "$env/static/private";
import * as logger from "$lib/logger";

import { getRequestId } from "./getRequestId";
import type { User } from "./types";

export interface RemoveUserOptions {
  cookies: Cookies;
}

/**
 * Removes the tokens from cookies.
 * @param options
 */
export const removeUser = ({ cookies }: RemoveUserOptions) => {
  cookies.delete("accessToken", {
    httpOnly: true,
    sameSite: "strict",
    secure: true,
    path: "/",
  });
  cookies.delete("refreshToken", {
    httpOnly: true,
    sameSite: "strict",
    secure: true,
    path: "/",
  });
};

export interface GetUserOptions {
  cookies: Cookies;
}

/**
 * Retrieves the tokens from cookies.
 * @param options
 * @returns
 */
export const getUser = ({ cookies }: GetUserOptions): User | undefined => {
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

export interface SetUserOptions {
  cookies: Cookies;
  accessToken: string;
  refreshToken: string;
}

/**
 * Sets the tokens in cookies.
 * @param options
 * @returns
 */
export const setUser = ({ cookies, accessToken, refreshToken }: SetUserOptions): User => {
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
  return {
    accessToken,
    refreshToken,
  };
};

export interface RefreshUserOptions {
  cookies: Cookies;
  fetch: typeof fetch;
}

/**
 * Refreshes the user and updates both tokens in cookies. Removes
 * user from cookies and returns `undefined` if:
 * - The old refresh token is not defined.
 * - The refresh did not go successfully.
 * - The refreshed data is not valid.
 * @param options
 * @returns
 */
export const refreshUser = async ({
  cookies,
  fetch,
}: RefreshUserOptions): Promise<User | undefined> => {
  const requestInfo = `function = refreshUser, requestId = ${getRequestId()}`;
  logger.log("refresh initiated:", `(${requestInfo})`);
  const oldRefreshToken = cookies.get("refreshToken");
  if (oldRefreshToken === undefined) {
    logger.error(
      "refresh failed:",
      `(${requestInfo}, error = User did not provide a refresh token.)`,
    );
    return removeUser({ cookies }), undefined;
  }
  const res = await fetch(new URL("/auth/refresh", USER_SERVICE_URI), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${oldRefreshToken}`,
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    logger.error("refresh failed:", `(${requestInfo}, error = ${await res.text()})`);
    return removeUser({ cookies }), undefined;
  }
  const data = (await res.json()) as {
    accessToken: unknown;
    refreshToken: unknown;
  };
  if (typeof data.accessToken !== "string" || typeof data.refreshToken !== "string") {
    logger.error(
      "refresh failed:",
      `(${requestInfo}, error = Data is not valid (value: ${JSON.stringify(data, null, 2)}).)`,
    );
    return removeUser({ cookies }), undefined;
  }
  logger.success("refresh successful:", `(${requestInfo})`);
  return setUser({ cookies, accessToken: data.accessToken, refreshToken: data.refreshToken });
};

export interface FetchWithUserOptions extends RequestInit {
  cookies: Cookies;
  fetch: typeof fetch;
  user: User | undefined;
  /**
   * Should the fetch proceed when `user` is `undefined`?
   */
  omitAuthorizationIfUndefined?: boolean;
}

/**
 * Attempts to fetch with the current access token, retries doing so with a refreshed
 * access token if the response is of status 401, and deletes the tokens if the second
 * one is also of status 401.
 *
 * If the user is `undefined` in any of the two tries, the fetch still proceeds with the
 * `Authorization` header omitted if `omitAuthorizationIfUndefined` is set to `true`; otherwise,
 * `undefined` is returned.
 * @param url
 * @param options
 * @returns
 */
export const fetchWithUser = async (
  url: URL,
  {
    cookies,
    fetch,
    user,
    omitAuthorizationIfUndefined = true,
    headers: headersInit,
    ...init
  }: FetchWithUserOptions,
): Promise<Response | undefined> => {
  const requestInfo = `function = fetchWithUser, requestId = ${getRequestId()}, url = ${url.href}`;
  const headers = new Headers(headersInit);

  logger.log("fetch initiated:", `(${requestInfo})`);

  if (user === undefined) {
    if (omitAuthorizationIfUndefined) {
      logger.log("fetch fallback:", `(${requestInfo}, attempt = 0, reason = USER_NOT_DEFINED)`);
      return await fetch(url, { ...init, headers });
    }
    logger.log("fetch removed user:", `(${requestInfo}, attempt = 0, reason = USER_NOT_DEFINED)`);
    return removeUser({ cookies }), undefined;
  }

  headers.set("Authorization", `Bearer ${user.accessToken}`);
  const resCurrentAccess = await fetch(url, { ...init, headers });
  if (resCurrentAccess.status !== 401) {
    logger.success("fetch successful:", `(${requestInfo}, attempt = 0)`);
    return resCurrentAccess;
  }

  logger.log("fetch attempt 2:", `(${requestInfo}, attempt = 1, reason = FETCH_UNAUTHORIZED)`);
  headers.delete("Authorization");
  user = await refreshUser({ cookies, fetch });
  if (user === undefined) {
    if (omitAuthorizationIfUndefined) {
      logger.log("fetch fallback:", `(${requestInfo}, attempt = 1, reason = USER_NOT_DEFINED)`);
      return await fetch(url, { ...init, headers });
    }
    logger.log("fetch removed user:", `(${requestInfo}, attempt = 1, reason = USER_NOT_DEFINED)`);
    return removeUser({ cookies }), undefined;
  }

  headers.set("Authorization", `Bearer ${user.accessToken}`);
  const resNewAccess = await fetch(url, { ...init, headers });
  if (resNewAccess.status !== 401) {
    logger.success("fetch successful:", `(${requestInfo}, attempt = 1)`);
    return resNewAccess;
  }

  logger.log("fetch removed user:", `(${requestInfo}, attempt = 1, reason = FETCH_UNAUTHORIZED)`);
  return removeUser({ cookies }), undefined;
};
