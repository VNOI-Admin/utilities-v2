import type { LayoutServerLoad } from "./$types";
import { error, redirect } from "@sveltejs/kit";

import { base } from "$app/paths";
import { USER_SERVICE_URI } from "$env/static/private";
import { getRequestId } from "$lib/getRequestId";
import * as logger from "$lib/logger";
import type { UserData } from "$lib/types";
import { fetchWithUser } from "$lib/users";

export const load: LayoutServerLoad = async ({ params, fetch, cookies, locals, depends }) => {
  //   return {
  //     userId: "foo",
  //     ip: "10.0.0.1",
  //     fullName: "bar",
  //     isOnline: true,
  //     cpu: 100,
  //     ram: 100,
  //     ping: 100,
  //     role: "user",
  //   };
  const requestInfo = `layout = /contestant/[userId], requestId = ${getRequestId()}, userId = ${params.userId}`;

  logger.log("fetching:", `(${requestInfo})...`);

  const res = await fetchWithUser(`${USER_SERVICE_URI}/user/${params.userId}`, {
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
    logger.error("fetch failed:", `(${requestInfo}, err = RESPONSE_NOT_DEFINED)...`);
    redirect(307, `${base}/login`);
  }

  if (!res.ok) {
    logger.error("fetch failed:", `(${requestInfo}, err = USER_NON_EXISTENT)...`);
    error(404, "User does not exist.");
  }

  const data = (await res.json()) as UserData;

  logger.success("fetched:", `(${requestInfo})...`);

  depends("contestant:data:info");

  return {
    userId: data.username,
    ip: data.vpnIpAddress,
    fullName: data.fullName,
    isOnline: data.machineUsage.isOnline,
    ...(locals.user?.data.role === "admin" && {
      cpu: data.machineUsage.cpu,
      ram: data.machineUsage.memory,
      ping: data.machineUsage.ping,
      role: data.role,
    }),
  };
};
