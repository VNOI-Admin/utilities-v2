import { error, redirect } from "@sveltejs/kit";

import { base } from "$app/paths";
import { USER_SERVICE_URI } from "$env/static/private";
import { addURLSearch } from "$lib/addURLSearch";
import { getRequestId } from "$lib/getRequestId";
import * as logger from "$lib/logger";
import { readonlyArrayIncludes } from "$lib/readonlyArrayIncludes";
import type { UserData } from "$lib/types";
import { fetchWithUser } from "$lib/users";

import {
  MAP_ORDER_BY_TO_DEVICE_INFO_KEY,
  PAGE_SIZE,
  VALID_ORDER_BY_VALUES,
  VALID_ORDER_VALUES,
} from "./$page.constants";
import type { Device } from "./$page.types";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url, cookies, fetch, depends, locals }) => {
  const requestInfo = `page = /, requestId = ${getRequestId()}`;

  if (!locals.user) {
    redirect(307, `${base}/login`);
  }

  logger.log("fetching:", `(${requestInfo})...`);

  const pageQuery = url.searchParams.get("page");
  const orderByQuery = url.searchParams.get("orderBy");
  const orderQuery = url.searchParams.get("order");
  const searchQuery = url.searchParams.get("q") || "";
  const page = pageQuery !== null ? parseInt(pageQuery, 10) : undefined;

  if (orderByQuery === null || !readonlyArrayIncludes(VALID_ORDER_BY_VALUES, orderByQuery)) {
    redirect(301, addURLSearch(url, { orderBy: "username" }));
  }
  if (orderQuery === null || !readonlyArrayIncludes(VALID_ORDER_VALUES, orderQuery)) {
    redirect(301, addURLSearch(url, { order: "asc" }));
  }

  const res = await fetchWithUser(
    addURLSearch(new URL("/user", USER_SERVICE_URI), { q: searchQuery }),
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

  const orderByDeviceKey = MAP_ORDER_BY_TO_DEVICE_INFO_KEY[orderByQuery];

  let devices = data.map(
    ({ machineUsage: { cpu, memory, disk, ping, isOnline, lastReportedAt }, ...rest }) => {
      return {
        cpu,
        memory,
        disk,
        ping,
        isOnline,
        lastReportedAt,
        ...rest,
      } satisfies Device;
    },
  );

  const totalPages = Math.ceil(devices.length / PAGE_SIZE);
  const onlineCount = devices.filter((device) => device.isOnline).length;
  const offlineCount = devices.length - onlineCount;

  if (page === undefined || Number.isNaN(page) || page < 0 || page > totalPages - 1) {
    redirect(301, addURLSearch(url, { page: "0" }));
  }

  devices = devices.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).sort((a, b) => {
    switch (orderQuery) {
      case "asc":
        return a[orderByDeviceKey] < b[orderByDeviceKey] ? -1 : 1;
      case "desc":
        return a[orderByDeviceKey] < b[orderByDeviceKey] ? 1 : -1;
      default: {
        const _val: never = orderQuery;
        throw new Error(`Unhandled orderQuery: ${_val}`);
      }
    }
  });

  depends("home:query");

  return {
    totalPages,
    devices: Array(100).fill(devices).flat(),
    onlineCount,
    offlineCount,
  };
};
