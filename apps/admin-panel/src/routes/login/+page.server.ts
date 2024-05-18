import { fail, redirect } from "@sveltejs/kit";

import { base } from "$app/paths";
import { USER_SERVICE_URI } from "$env/static/private";
import { getRequestId } from "$lib/getRequestId";
import { httpErrors } from "$lib/httpErrors";
import * as logger from "$lib/logger";
import { fetchWithUser, removeUserTokens, setUserTokens } from "$lib/users";

import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ locals }) => {
  if (locals.user) {
    redirect(303, `${base}/`);
  }
  return {
    title: "Login",
  };
};

export const actions: Actions = {
  async login({ request, cookies, fetch }) {
    const requestInfo = `page = /login, action = /login, requestId = ${getRequestId()}`;
    try {
      logger.log("logging in:", `(${requestInfo})...`);
      const formData = await request.formData();
      const username = formData.get("username");
      const password = formData.get("password");
      if (typeof username !== "string") {
        logger.error(
          "failed to login:",
          `(${requestInfo}, error = User provided an invalid username, which is ${username})`,
        );
        return fail(400, { usernameError: "Username is not valid!" });
      }
      if (typeof password !== "string") {
        logger.error(
          "failed to login:",
          `(${requestInfo}, error = User provided an invalid password.)`,
        );
        return fail(400, { passwordError: "Password is not valid!" });
      }
      const res = await fetch(`${USER_SERVICE_URI}/auth/login`, {
        method: "POST",
        body: JSON.stringify({
          username,
          password,
        }),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        const { error, message, statusCode } = (await res.json()) as {
          message: string;
          error: string;
          statusCode: number;
        };
        logger.error(
          "failed to login:",
          `(${requestInfo}, error = ${error}, message = ${message}, status = ${statusCode})`,
        );
        return fail(statusCode, { error: message });
      }
      const data = (await res.json()) as {
        accessToken: unknown;
        refreshToken: unknown;
      };
      if (typeof data.accessToken !== "string" || typeof data.refreshToken !== "string") {
        logger.error("failed to login:", `(${requestInfo}, error = Backend data is not valid.)`);
        return fail(500, { error: httpErrors.internalServerError });
      }
      logger.success("logged in successfully:", `(${requestInfo})`);
      setUserTokens({ cookies, accessToken: data.accessToken, refreshToken: data.refreshToken });
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        logger.error(
          "failed to login:",
          `(${requestInfo}, error = Timeout. It took too long to get the result!)`,
        );
        return fail(500, { error: httpErrors.heavyLoad });
      }
      logger.error("failed to login:", `(${requestInfo}, error = ${err})`);
      return fail(500, { error: httpErrors.internalServerError });
    }
  },
  async logout({ locals, fetch, cookies }) {
    const requestInfo = `page = /login, action = /logout, requestId = ${getRequestId()}`;
    try {
      logger.log("logging in:", `(${requestInfo})...`);
      const res = await fetchWithUser(`${USER_SERVICE_URI}/auth/logout`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000),
        fetch,
        cookies,
        user: locals.user,
      });
      if (res === undefined) {
        logger.error("failed to logout:", `(${requestInfo}, error = POSSIBLY_NOT_LOGGED_IN?)`);
        return fail(401, { error: httpErrors.unauthenticated });
      }
      if (!res.ok) {
        logger.error("fetch failed:", `(${requestInfo}, error = ${await res.text()})`);
        return fail(500, { error: httpErrors.internalServerError });
      }
      logger.success("logged out successfully:", `(${requestInfo}, message = ${await res.text()})`);
      removeUserTokens({ cookies });
      locals.user = undefined;
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        logger.error(
          "failed to logout:",
          `(${requestInfo}, error = Timeout. It took too long to get the result!)`,
        );
        return fail(500, { error: httpErrors.heavyLoad });
      }
      logger.error("failed to logout:", `(${requestInfo}, error = ${err})`);
      return fail(500, { error: httpErrors.internalServerError });
    }
  },
};
