import { Role } from "@libs/common/decorators/role.decorator";
import { error, redirect } from "@sveltejs/kit";

import { base } from "$app/paths";
import { setURLSearch } from "$lib/setURLSearch";
import { getRequestId } from "$lib/getRequestId";
import * as logger from "$lib/logger";
import type { UserData } from "$lib/types";
import { fetchWithUser } from "$lib/users";
import { removeURLSearch } from "$lib/removeURLSearch";

import { PAGE_SIZE } from "./$page.constants";
import type { Device } from "./$page.types";
import type { PageServerLoad } from "./$types";
import { parseUserQuery } from "./$page.utils.server";

export const load: PageServerLoad = async ({ url, cookies, fetch, depends, locals }) => {
  const requestInfo = `page = /, requestId = ${getRequestId()}`;

  if (!locals.user) {
    redirect(307, `${base}/login`);
  }

  const isAdmin = locals.user.data.role === Role.ADMIN;

  if (!isAdmin) {
    redirect(307, `${base}/`);
  }

  logger.log("fetching:", `(${requestInfo})...`);

  const pageQuery = url.searchParams.get("page");
  const searchQuery = url.searchParams.get("q");
  const roleQuery = url.searchParams.get("roleFilter");
  const ascQuery = url.searchParams.getAll("asc");
  const descQuery = url.searchParams.getAll("desc");

  const page = pageQuery !== null ? parseInt(pageQuery, 10) : undefined;
  const role = Object.values(Role).find((roleValue) => roleValue === roleQuery);

  if (page === undefined || Number.isNaN(page) || page < 0) {
    redirect(301, setURLSearch(url, { page: "0" }));
  }
  if (roleQuery !== null && role === undefined) {
    redirect(301, removeURLSearch(url, ["roleFilter"]));
  }

  const res = await fetchWithUser(parseUserQuery(searchQuery, role, ascQuery, descQuery), {
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
    redirect(307, `${base}/login`);
  }

  if (!res.ok) {
    logger.error("fetch failed:", `(${requestInfo}, error = ${await res.text()})`);
    error(500, "Failed to fetch user devices.");
  }

  const data = (await res.json()) as UserData[];

  logger.success("fetched:", `(${requestInfo})...`);

  const devices = data.map(
    ({ machineUsage: { cpu, memory, disk, ping, isOnline, lastReportedAt }, ...rest }) => {
      return {
        ...(isAdmin && { cpu, memory, disk, ping }),
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

  depends("contestants:query");

  return {
    totalPages,
    devices: devices.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    onlineCount,
    offlineCount,
  };
};
