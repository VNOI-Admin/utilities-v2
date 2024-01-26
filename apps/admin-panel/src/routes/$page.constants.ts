import type { DeviceInfoKeys, OrderBy } from "./$page.types";

export const VALID_ORDER_VALUES = ["asc", "desc"] as const;
export const VALID_ORDER_BY_VALUES = ["username", "ip", "ping", "cpu", "memory"] as const;
export const MAP_DEVICE_INFO_KEYS_TO_NAME = {
  username: "ID",
  vpnIpAddress: "IP",
  fullName: "Name",
  role: "Role",
  isActive: "Online",
  cpu: "CPU usage",
  memory: "RAM usage",
  disk: "Disk usage",
  ping: "Ping",
  lastReportedAt: "Last reported",
} satisfies Record<DeviceInfoKeys, string>;
export const MAP_DEVICE_INFO_KEYS_TO_ORDER_BY: Partial<Record<DeviceInfoKeys, OrderBy>> = {
  username: "username",
  vpnIpAddress: "ip",
  ping: "ping",
  cpu: "cpu",
  memory: "memory",
};
export const MAP_ORDER_BY_TO_DEVICE_INFO_KEY = {
  username: "username",
  ip: "vpnIpAddress",
  ping: "ping",
  cpu: "cpu",
  memory: "memory",
} satisfies Record<OrderBy, DeviceInfoKeys>;
// This should be in the same order as the one used in DeviceInfo.
export const DEVICE_KEYS = [
  "username",
  "vpnIpAddress",
  "isActive",
  "ping",
  "cpu",
  "memory",
] satisfies DeviceInfoKeys[];
export const PAGE_SIZE = 20;