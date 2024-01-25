import { type Handle, type HandleServerError } from "@sveltejs/kit";

import { getUser } from "$lib/users";

export const handleError: HandleServerError = ({ error }) => {
  return {
    message: (error as any)?.message || "Whoops! An unexpected internal server error occurred.",
    code: (error as any)?.code ?? "UNKNOWN_ERROR",
  };
};

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.user = getUser({ cookies: event.cookies });
  return await resolve(event);
};
