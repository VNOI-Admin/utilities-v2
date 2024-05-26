import { base } from "$app/paths";
import { USER_SERVICE_URI } from "$env/static/private";
import { getRequestId } from "$lib/getRequestId";
import * as logger from "$lib/logger";
import type { UserData } from "$lib/types";
import { fetchWithUser } from "$lib/users";
import { Role } from "@libs/common/decorators/role.decorator";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = ({ cookies, locals, url }) => {
  const requestInfo = `file = routes/+layout.server.ts, requestId = ${getRequestId()}`;
  return {
    user: locals.user && {
      username: locals.user.data.username,
      isAdmin: locals.user.data.role === Role.ADMIN,
    },
    quickSwitch: (async () => {
      if (!url.pathname.startsWith(`${base}/contestant`)) {
        return undefined;
      }

      if (!locals.user) {
        return undefined;
      }

      try {
        const resOthers = await fetchWithUser(`${USER_SERVICE_URI}/user`, {
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

        if (resOthers === undefined) {
          logger.error(
            "fetch failed:",
            `(${requestInfo}, type = QUICK_SWITCH_LIST, error = USER_UNAUTHORIZED)`,
          );
          return { error: "Failed to fetch quick switch." };
        }

        if (!resOthers.ok) {
          logger.error(
            "fetch failed:",
            `(${requestInfo}, type = QUICK_SWITCH_LIST, error = ${await resOthers.text()})`,
          );
          return { error: "Failed to fetch quick switch." };
        }

        const data = ((await resOthers.json()) as UserData[])
          .filter((user) => user.machineUsage.isOnline)
          .map(({ username }) => username);

        logger.success("fetched:", `(${requestInfo}, type = QUICK_SWITCH_LIST)...`);

        return data;
      } catch (err) {
        logger.error("fetch failed:", `(${requestInfo}, type = QUICK_SWITCH_LIST, error = ${err})`);
        return { error: "Internal Server Error" };
      }
    })(),
  };
};
