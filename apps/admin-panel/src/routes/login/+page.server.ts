import { fail, redirect } from "@sveltejs/kit";

import { API_ENDPOINT } from "$env/static/private";
import { getRequestId } from "$lib/getRequestId";
import { setUser } from "$lib/users";

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
    const requestInfo = `page = /, requestId = ${getRequestId()}`;
    try {
      console.log(`Attempting to login (${requestInfo})`);
      const formData = await request.formData();
      const username = formData.get("username");
      const password = formData.get("password");
      if (typeof username !== "string") {
        console.error(
          `Error occurred during login (${requestInfo}, error = User provided an invalid username, which is ${username})`,
        );
        return fail(400, { usernameError: "Username is not valid!" });
      }
      if (typeof password !== "string") {
        console.error(
          `Error occurred during login (${requestInfo}, error = User provided an invalid password.)`,
        );
        return fail(400, { passwordError: "Password is not valid!" });
      }
      const res = await fetch(new URL("/auth/login", API_ENDPOINT), {
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
        console.error(`Error occurred during login (${requestInfo}, error = ${await res.text()})`);
        return fail(500, { error: "Internal Server Error" });
      }
      const data = (await res.json()) as {
        accessToken: unknown;
        refreshToken: unknown;
      };
      if (typeof data.accessToken !== "string" || typeof data.refreshToken !== "string") {
        console.error(
          `Error occurred during login (${requestInfo}, error = Backend data is not valid.)`,
        );
        return fail(500, { error: "Internal Server Error" });
      }
      console.log(`Successfully logged in (${requestInfo})`);
      setUser({ cookies, accessToken: data.accessToken, refreshToken: data.refreshToken });
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        console.error(
          `Error occurred during login (${requestInfo}, error = Timeout. It took too long to get the result!)`,
        );
        return fail(500, { error: "Server is currently under heavy load." });
      }
      console.error(`Error occurred during login (${requestInfo}, error = ${err})`);
      return fail(500, { error: "Internal Server Error" });
    }
  },
};
