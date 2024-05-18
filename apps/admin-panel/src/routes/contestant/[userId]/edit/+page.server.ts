import { fail, redirect } from "@sveltejs/kit";

import { base } from "$app/paths";
import { USER_SERVICE_URI } from "$env/static/private";
import { getRequestId } from "$lib/getRequestId";
import * as logger from "$lib/logger";
import { fetchWithUser } from "$lib/users";

import { updateUserSchema } from "./$page.schema";
import type { Actions, PageServerLoad } from "./$types";

export const actions: Actions = {
  async default({ cookies, locals, params, request }) {
    let newUserId: string | null = null;
    const requestInfo = `page = /contestant/[userId]/edit, requestId = ${getRequestId()}, userId = ${params.userId}`;
    try {
      const formData = await request.formData();
      const data = await updateUserSchema.spa({
        username: formData.get("username"),
        fullName: formData.get("fullName"),
        password: formData.get("password"),
        role: formData.get("role"),
      });
      if (!data.success) {
        return fail(400, { validationErrors: data.error.flatten().fieldErrors });
      }
      const res = await fetchWithUser(`${USER_SERVICE_URI}/user/${params.userId}`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000),
        fetch,
        cookies,
        user: locals.user,
        body: JSON.stringify({
          fullName: data.data.fullName,
          password: data.data.password,
          usernameNew: data.data.username,
          role: data.data.role,
        }),
      });
      if (res === undefined) {
        logger.error("failed to update user:", `(${requestInfo}, error = POSSIBLY_NOT_LOGGED_IN?)`);
        return fail(500, { error: "You are not logged in!" });
      }
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
      newUserId = data.data.username;
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        logger.error(
          "failed to logout:",
          `(${requestInfo}, error = Timeout. It took too long to get the result!)`,
        );
        return fail(500, { error: "Server is currently under heavy load." });
      }
      logger.error("failed to logout:", `(${requestInfo}, error = ${err})`);
      return fail(500, { error: "Internal Server Error" });
    }
    redirect(307, `${base}/contestant${newUserId ? `/${newUserId}` : ""}`);
  },
};

export const load: PageServerLoad = async ({ parent }) => {
  const data = await parent();

  return {
    title: `Edit - Contestant ${data.userId}`,
  };
};
