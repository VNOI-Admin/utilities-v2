import type { Cookies } from "@sveltejs/kit";

import { AUTH_SERVICE_URI, SECURE_COOKIES, USER_SERVICE_URI } from "$env/static/private";
import * as logger from "$lib/logger";

import { getRequestId } from "./getRequestId";
import type { User, UserData, UserTokens } from "./types";

export interface RemoveUserTokensOptions {
  cookies: Cookies;
}

const secureCookies = SECURE_COOKIES === "true";

/**
 * Removes the tokens from cookies.
 * @param options
 */
export const removeUserTokens = ({ cookies }: RemoveUserTokensOptions) => {
  cookies.delete("accessToken", {
    httpOnly: true,
    sameSite: "strict",
    secure: secureCookies,
    path: "/",
  });
  cookies.delete("refreshToken", {
    httpOnly: true,
    sameSite: "strict",
    secure: secureCookies,
    path: "/",
  });
};

export interface SetUserTokensOptions {
  cookies: Cookies;
  accessToken: string;
  refreshToken: string;
}

/**
 * Sets the tokens in cookies.
 * @param options
 * @returns
 */
export const setUserTokens = ({
  cookies,
  accessToken,
  refreshToken,
}: SetUserTokensOptions): UserTokens => {
  cookies.set("accessToken", accessToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: secureCookies,
    path: "/",
  });
  cookies.set("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: "strict",
    secure: secureCookies,
    path: "/",
  });
  return {
    accessToken,
    refreshToken,
  };
};

export interface RefreshUserTokensOptions {
  cookies: Cookies;
  fetch: typeof fetch;
}

export const refreshUserTokens = async ({
  cookies,
  fetch,
}: RefreshUserTokensOptions): Promise<UserTokens | undefined> => {
  const requestInfo = `requestId = ${getRequestId()}`;
  logger.log("refreshUserTokens initiated:", `(${requestInfo})`);
  const oldRefreshToken = cookies.get("refreshToken");
  if (oldRefreshToken === undefined) {
    logger.error(
      "refreshUserTokens failed:",
      `(${requestInfo}, error = User did not provide a refresh token.)`,
    );
    return removeUserTokens({ cookies }), undefined;
  }
  const res = await fetch(`${AUTH_SERVICE_URI}/auth/refresh`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${oldRefreshToken}`,
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    logger.error("refreshUserTokens failed:", `(${requestInfo}, error = ${await res.text()})`);
    return removeUserTokens({ cookies }), undefined;
  }
  const data = (await res.json()) as {
    accessToken: unknown;
    refreshToken: unknown;
  };
  if (typeof data.accessToken !== "string" || typeof data.refreshToken !== "string") {
    logger.error(
      "refreshUserTokens failed:",
      `(${requestInfo}, error = Data is not valid (value: ${JSON.stringify(data, null, 2)}).)`,
    );
    return removeUserTokens({ cookies }), undefined;
  }

  const userTokens = setUserTokens({
    cookies,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });

  logger.success("refreshUserTokens successful:", `(${requestInfo})`);

  return userTokens;
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
  const requestInfo = `requestId = ${getRequestId()}`;
  logger.log("refreshUser initiated:", `(${requestInfo})`);

  const userTokens = await refreshUserTokens({ cookies, fetch });

  if (userTokens === undefined) {
    return undefined;
  }

  const userDataRes = await fetch(`${USER_SERVICE_URI}/user/me`, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${userTokens.accessToken}`,
    },
  });

  if (!userDataRes.ok) {
    logger.error("refreshUser failed:", `(${requestInfo}, error = ${await userDataRes.text()}).)`);
    return removeUserTokens({ cookies }), undefined;
  }

  const userData = (await userDataRes.json()) as UserData;

  logger.success("refreshUser successful:", `(${requestInfo})`);

  return {
    token: userTokens,
    data: userData,
  };
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
  url: URL | string,
  {
    cookies,
    fetch,
    user,
    omitAuthorizationIfUndefined = true,
    headers: headersInit,
    ...init
  }: FetchWithUserOptions,
): Promise<Response | undefined> => {
  const requestInfo = `requestId = ${getRequestId()}, url = ${typeof url === "string" ? url : url.href}`;
  const headers = new Headers(headersInit);

  logger.log("fetchWithUser initiated:", `(${requestInfo})`);

  if (user === undefined) {
    if (omitAuthorizationIfUndefined) {
      logger.log(
        "fetchWithUser fallback:",
        `(${requestInfo}, attempt = 0, reason = USER_NOT_DEFINED)`,
      );
      return await fetch(url, { ...init, headers });
    }
    logger.log(
      "fetchWithUser removed user:",
      `(${requestInfo}, attempt = 0, reason = USER_NOT_DEFINED)`,
    );
    return removeUserTokens({ cookies }), undefined;
  }

  headers.set("Authorization", `Bearer ${user.token.accessToken}`);
  const resCurrentAccess = await fetch(url, { ...init, headers });
  if (resCurrentAccess.status !== 401) {
    logger.success(
      "fetchWithUser successful:",
      `(${requestInfo}, status = ${resCurrentAccess.status}, attempt = 0)`,
    );
    return resCurrentAccess;
  }

  logger.log(
    "fetchWithUser attempt 2:",
    `(${requestInfo}, attempt = 1, reason = FETCH_UNAUTHORIZED)`,
  );
  headers.delete("Authorization");
  user = await refreshUser({ cookies, fetch });
  if (user === undefined) {
    if (omitAuthorizationIfUndefined) {
      logger.log(
        "fetchWithUser fallback:",
        `(${requestInfo}, attempt = 1, reason = USER_NOT_DEFINED)`,
      );
      return await fetch(url, { ...init, headers });
    }
    logger.log(
      "fetchWithUser removed user:",
      `(${requestInfo}, attempt = 1, reason = USER_NOT_DEFINED)`,
    );
    return removeUserTokens({ cookies }), undefined;
  }

  headers.set("Authorization", `Bearer ${user.token.accessToken}`);
  const resNewAccess = await fetch(url, { ...init, headers });
  if (resNewAccess.status !== 401) {
    logger.success(
      "fetchWithUser successful:",
      `(${requestInfo}, status = ${resNewAccess.status}, attempt = 1)`,
    );
    return resNewAccess;
  }

  logger.log(
    "fetchWithUser removed user:",
    `(${requestInfo}, attempt = 1, reason = FETCH_UNAUTHORIZED)`,
  );
  return removeUserTokens({ cookies }), undefined;
};

export interface GetUserOptions {
  cookies: Cookies;
  fetch: typeof fetch;
}

/**
 * Retrieves the tokens from cookies.
 * @param options
 * @returns
 */
export const getUser = async ({ cookies, fetch }: GetUserOptions): Promise<User | undefined> => {
  const requestInfo = `requestId = ${getRequestId()}`;
  logger.log("getUser initiated:", `${requestInfo}`);

  const accessToken = cookies.get("accessToken");
  const refreshToken = cookies.get("refreshToken");

  if (accessToken === undefined || refreshToken === undefined) {
    logger.success("getUser successful:", `${requestInfo}, status = LOGGED_OUT`);
    return undefined;
  }

  let userTokens: UserTokens | undefined = {
    accessToken,
    refreshToken,
  };

  const headers = new Headers();

  headers.set("Authorization", `Bearer ${userTokens.accessToken}`);
  const userDataResCurrent = await fetch(`${USER_SERVICE_URI}/user/me`, { headers });
  if (userDataResCurrent.status !== 401) {
    logger.success("getUser successful:", `(${requestInfo}, attempt = 0)`);
    const userData = await userDataResCurrent.json();
    return {
      token: userTokens,
      data: userData,
    };
  }

  logger.log("getUser attempt 2:", `(${requestInfo}, attempt = 1, reason = FETCH_UNAUTHORIZED)`);
  headers.delete("Authorization");
  userTokens = await refreshUserTokens({ cookies, fetch });
  if (userTokens === undefined) {
    logger.log("getUser removed user:", `(${requestInfo}, attempt = 1, reason = USER_NOT_DEFINED)`);
    return removeUserTokens({ cookies }), undefined;
  }

  headers.set("Authorization", `Bearer ${userTokens.accessToken}`);
  const userDataResNew = await fetch(`${USER_SERVICE_URI}/user/me`, { headers });
  if (userDataResNew.status !== 401) {
    logger.success("getUser successful:", `(${requestInfo}, attempt = 1)`);
    const userData = await userDataResNew.json();
    return {
      token: userTokens,
      data: userData,
    };
  }

  logger.log("getUser removed user:", `(${requestInfo}, attempt = 1, reason = FETCH_UNAUTHORIZED)`);
  return removeUserTokens({ cookies }), undefined;
};
