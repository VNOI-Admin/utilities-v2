import type { VALID_ORDER_BY_VALUES, VALID_ORDER_VALUES } from "./$page.constants";

export interface Device {
  username: string;
  vpnIpAddress: string;
  fullName: string;
  role: string;
  isActive: boolean;
  cpu: number;
  memory: number;
  disk: number;
  ping: number;
  lastReportedAt: string;
}

export type DeviceInfoKeys = keyof Device;
export type Order = (typeof VALID_ORDER_VALUES)[number];
export type OrderBy = (typeof VALID_ORDER_BY_VALUES)[number];
