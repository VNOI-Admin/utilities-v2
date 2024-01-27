import { randomUUID } from "node:crypto";

import { error, redirect } from "@sveltejs/kit";

import { USER_SERVICE_URI } from "$env/static/private";
import * as logger from "$lib/logger";
import type { UserData } from "$lib/types";
import { fetchWithUser } from "$lib/users";

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, fetch, cookies, locals, depends }) => {
  depends("contestant:data:info");
  const requestInfo = `page = /contestant/[userId], requestId = ${randomUUID()}, userId = ${params.userId}`;

  logger.log("fetching:", `(${requestInfo})...`);

  const res = await fetchWithUser(new URL(`/user/${params.userId}`, USER_SERVICE_URI), {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(10000),
    cookies,
    fetch,
    user: locals.user,
    omitAuthorizationIfUndefined: false,
  });

  if (res === undefined) {
    logger.error("fetch failed:", `(${requestInfo}, err = REQUEST_NOT_DEFINED)...`);
    redirect(307, "/login");
  }

  if (!res.ok) {
    logger.error("fetch failed:", `(${requestInfo}, err = USER_NON_EXISTENT)...`);
    error(404, "User does not exist.");
  }

  const data = (await res.json()) as UserData;

  logger.success("fetched:", `(${requestInfo})...`);

  return {
    title: `Contestant ${data.username}`,
    userId: data.username,
    ip: data.vpnIpAddress,
    cpu: data.machineUsage.cpu,
    ram: data.machineUsage.memory,
    isOnline: data.machineUsage.isOnline,
    ping: data.machineUsage.ping,
  };
};
