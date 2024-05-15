import type { DeviceInfoKeys, Order, OrderBy } from "./$page.types";

export const PAGE_SIZE = 20;
export const VALID_ORDER_VALUES = ["asc", "desc"] as const;
export const VALID_ORDER_SELECT_VALUES = [
  ["asc", "Ascending"],
  ["desc", "Descending"],
] satisfies [Order, string][];
export const VALID_ORDER_BY_VALUES = ["userid", "username"] as const;
export const VALID_ORDER_BY_VALUES_ADMIN = ["ip", "ping", "cpu", "memory"] as const;
export const VALID_ORDER_BY_SELECT_VALUES = [
  ["userid", "User ID"],
  ["ip", "IP"],
  ["ping", "Ping"],
  ["cpu", "CPU"],
  ["memory", "RAM"],
] satisfies [OrderBy, string][];
// This should be in the same order as the one used in DeviceInfo.
export const DEVICE_KEYS = [
  ["username", "ID", "userid"],
  ["fullName", "Full name", "username"],
  ["vpnIpAddress", "IP", "ip"],
  ["isOnline", "Online", null],
  ["ping", "Ping", "ping"],
  ["cpu", "CPU", "cpu"],
  ["memory", "RAM", "memory"],
] satisfies [DeviceInfoKeys, string, OrderBy | null][];
export const MAP_ORDER_BY_TO_DEVICE_INFO_KEY = {
  userid: "username",
  username: "fullName",
  ip: "vpnIpAddress",
  ping: "ping",
  cpu: "cpu",
  memory: "memory",
} satisfies Record<OrderBy, DeviceInfoKeys>;
