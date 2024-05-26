import type { Role } from "@libs/common/decorators/role.decorator";

import { USER_SERVICE_URI } from "$env/static/private";

import { MAP_ORDER_BY_TO_DEVICE_INFO_KEY } from "./$page.constants";

export const parseUserQuery = (search: string | null, role: Role | undefined, asc: string[], desc: string[]) => {
  const url = new URL(`${USER_SERVICE_URI}/user`);
  if (search) {
    url.searchParams.set("q", search);
  }
  if (role) {
    url.searchParams.set("role", role);
  }
  if (asc.length > 0 || desc.length > 0) {
    url.searchParams.set(
      "orderBy",
      [
        ...asc
          .map((e) =>
            Object.hasOwn(MAP_ORDER_BY_TO_DEVICE_INFO_KEY, e)
              ? `${MAP_ORDER_BY_TO_DEVICE_INFO_KEY[e as keyof typeof MAP_ORDER_BY_TO_DEVICE_INFO_KEY]}:1`
              : null,
          )
          .filter((e) => e !== null),
        ...desc
          .map((e) =>
            Object.hasOwn(MAP_ORDER_BY_TO_DEVICE_INFO_KEY, e)
              ? `${MAP_ORDER_BY_TO_DEVICE_INFO_KEY[e as keyof typeof MAP_ORDER_BY_TO_DEVICE_INFO_KEY]}:-1`
              : null,
          )
          .filter((e) => e !== null),
      ].join(","),
    );
  }
  return url;
};
