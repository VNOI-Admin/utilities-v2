import { fail, redirect } from "@sveltejs/kit";

import { USER_SERVICE_URI } from "$env/static/private";
import { getRequestId } from "$lib/getRequestId";
import * as logger from "$lib/logger";
import { setUserTokens } from "$lib/users";

import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ locals }) => {
  if (locals.user) {
    redirect(303, "/");
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
      const res = await fetch(new URL("/auth/login", USER_SERVICE_URI), {
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
        logger.error("failed to login:", `(${requestInfo}, error = ${await res.text()})`);
        return fail(500, { error: "Internal Server Error" });
      }
      const data = (await res.json()) as {
        accessToken: unknown;
        refreshToken: unknown;
      };
      if (typeof data.accessToken !== "string" || typeof data.refreshToken !== "string") {
        logger.error("failed to login:", `(${requestInfo}, error = Backend data is not valid.)`);
        return fail(500, { error: "Internal Server Error" });
      }
      logger.success("logged in successfully:", `(${requestInfo})`);
      setUserTokens({ cookies, accessToken: data.accessToken, refreshToken: data.refreshToken });
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        logger.error(
          "failed to login:",
          `(${requestInfo}, error = Timeout. It took too long to get the result!)`,
        );
        return fail(500, { error: "Server is currently under heavy load." });
      }
      logger.error("failed to login:", `(${requestInfo}, error = ${err})`);
      return fail(500, { error: "Internal Server Error" });
    }
  },
};
