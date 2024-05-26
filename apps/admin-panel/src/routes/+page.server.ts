import { error, redirect } from "@sveltejs/kit";

import { base } from "$app/paths";
import { setURLSearch } from "$lib/setURLSearch";
import { getRequestId } from "$lib/getRequestId";
import * as logger from "$lib/logger";
import type { UserData } from "$lib/types";
import { fetchWithUser } from "$lib/users";
import { Role } from "@libs/common/decorators/role.decorator";

import { PAGE_SIZE } from "./contestant/$page.constants";
import type { Device } from "./contestant/$page.types";
import type { PageServerLoad } from "./$types";
import { parseUserQuery } from "./contestant/$page.utils.server";

export const load: PageServerLoad = async ({ url, cookies, fetch, depends, locals }) => {
  const requestInfo = `page = /, requestId = ${getRequestId()}`;

  if (!locals.user) {
    redirect(307, `${base}/login`);
  }

  logger.log("fetching:", `(${requestInfo})...`);

  const pageQuery = url.searchParams.get("page");
  const searchQuery = url.searchParams.get("q");
  const ascQuery = url.searchParams.getAll("asc");
  const descQuery = url.searchParams.getAll("desc");

  const page = pageQuery !== null ? parseInt(pageQuery, 10) : undefined;

  if (page === undefined || Number.isNaN(page) || page < 0) {
    redirect(301, setURLSearch(url, { page: "0" }));
  }

  const res = await fetchWithUser(
    parseUserQuery(searchQuery, Role.CONTESTANT, ascQuery, descQuery),
    {
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
    },
  );

  if (res === undefined) {
    redirect(307, `${base}/login`);
  }

  if (!res.ok) {
    logger.error("fetch failed:", `(${requestInfo}, error = ${await res.text()})`);
    error(500, "Failed to fetch user devices.");
  }

  const data = (await res.json()) as UserData[];

  logger.success("fetched:", `(${requestInfo})...`);

  const devices = data.map(
    ({ machineUsage: { isOnline, lastReportedAt }, vpnIpAddress, ...rest }) => {
      return {
        isOnline,
        lastReportedAt,
        ...rest,
      } satisfies Device;
    },
  );
  const totalPages = devices.length === 0 ? 1 : Math.ceil(devices.length / PAGE_SIZE);
  const onlineCount = devices.filter((device) => device.isOnline).length;
  const offlineCount = devices.length - onlineCount;

  if (page > totalPages - 1) {
    redirect(301, setURLSearch(url, { page: "0" }));
  }

  depends("home:query");

  return {
    totalPages,
    devices: devices.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    onlineCount,
    offlineCount,
  };
};
