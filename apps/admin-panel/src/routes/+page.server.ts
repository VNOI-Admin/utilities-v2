import { redirect } from "@sveltejs/kit";

import { addURLSearch } from "$lib/addURLSearch";
import { getRequestId } from "$lib/getRequestId";
import * as logger from "$lib/logger";
import { readonlyArrayIncludes } from "$lib/readonlyArrayIncludes";

import { VALID_ORDER_BY_VALUES, VALID_ORDER_VALUES } from "./$page.constants";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ url, depends, locals }) => {
  depends("home:query");
  const requestInfo = `page = /, requestId = ${getRequestId()}`;
  if (!locals.user) {
    redirect(307, "/login");
  }

  logger.log("fetching:", `(${requestInfo})...`);
  
  const totalPages = 2;
  const pageQuery = url.searchParams.get("page");
  const orderByQuery = url.searchParams.get("orderBy");
  const orderQuery = url.searchParams.get("order");
  const page = pageQuery !== null ? parseInt(pageQuery, 10) : undefined;

  if (page === undefined || isNaN(page) || page < 0 || page > totalPages - 1) {
    redirect(301, addURLSearch(url, { page: "0" }));
  }
  if (orderByQuery === null || !readonlyArrayIncludes(VALID_ORDER_BY_VALUES, orderByQuery)) {
    redirect(301, addURLSearch(url, { orderBy: "username" }));
  }
  if (orderQuery === null || !readonlyArrayIncludes(VALID_ORDER_VALUES, orderQuery)) {
    redirect(301, addURLSearch(url, { order: "desc" }));
  }

  logger.success("fetched:", `(${requestInfo})...`);

  return {
    totalPages,
    devices: [
      {
        userId: "testuser2",
        ip: "10.0.0.2",
        cpu: 0,
        ram: 0,
        ping: -1,
        isOnline: false,
      },
      {
        userId: "testuser",
        ip: "10.0.0.1",
        cpu: 0,
        ram: 0,
        ping: -1,
        isOnline: false,
      },
      {
        userId: "final20",
        ip: "10.0.0.22",
        cpu: 0,
        ram: 0,
        ping: -1,
        isOnline: false,
      },
      {
        userId: "final19",
        ip: "10.0.0.21",
        cpu: 0,
        ram: 0,
        ping: -1,
        isOnline: false,
      },
      {
        userId: "final18",
        ip: "10.0.0.20",
        cpu: 0,
        ram: 0,
        ping: -1,
        isOnline: false,
      },
      {
        userId: "final17",
        ip: "10.0.0.19",
        cpu: 0,
        ram: 0,
        ping: -1,
        isOnline: false,
      },
      {
        userId: "final16",
        ip: "10.0.0.18",
        cpu: 0,
        ram: 0,
        ping: -1,
        isOnline: false,
      },
      {
        userId: "final15",
        ip: "10.0.0.17",
        cpu: 0,
        ram: 0,
        ping: -1,
        isOnline: false,
      },
      {
        userId: "final14",
        ip: "10.0.0.16",
        cpu: 0,
        ram: 0,
        ping: -1,
        isOnline: false,
      },
      {
        userId: "final13",
        ip: "10.0.0.15",
        cpu: 0,
        ram: 0,
        ping: -1,
        isOnline: false,
      },
      {
        userId: "final12",
        ip: "10.0.0.14",
        cpu: 0,
        ram: 0,
        ping: -1,
        isOnline: false,
      },
      {
        userId: "final11",
        ip: "10.0.0.13",
        cpu: 0,
        ram: 0,
        ping: -1,
        isOnline: false,
      },
      {
        userId: "final10",
        ip: "10.0.0.12",
        cpu: 0,
        ram: 0,
        ping: -1,
        isOnline: false,
      },
      {
        userId: "final09",
        ip: "10.0.0.11",
        cpu: 0,
        ram: 0,
        ping: -1,
        isOnline: false,
      },
      {
        userId: "final08",
        ip: "10.0.0.10",
        cpu: 0,
        ram: 0,
        ping: -1,
        isOnline: false,
      },
      {
        userId: "final07",
        ip: "10.0.0.9",
        cpu: 0,
        ram: 0,
        ping: -1,
        isOnline: false,
      },
      {
        userId: "final06",
        ip: "10.0.0.8",
        cpu: 0,
        ram: 0,
        ping: -1,
        isOnline: false,
      },
      {
        userId: "final05",
        ip: "10.0.0.7",
        cpu: 0,
        ram: 0,
        ping: -1,
        isOnline: false,
      },
      {
        userId: "final04",
        ip: "10.0.0.6",
        cpu: 0,
        ram: 0,
        ping: -1,
        isOnline: false,
      },
      {
        userId: "final03",
        ip: "10.0.0.5",
        cpu: 0,
        ram: 0,
        ping: -1,
        isOnline: false,
      },
    ],
    onlineCount: 0,
    offlineCount: 22,
  };
};
