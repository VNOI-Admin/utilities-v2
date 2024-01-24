import type { VALID_ORDER_BY_VALUES, VALID_ORDER_VALUES } from "./$page.constants";

export interface Device {
  userId: string;
  ip: string;
  cpu: number;
  ram: number;
  ping: number;
  isOnline: boolean;
}

export type DeviceInfoKeys = keyof Device;
export type Order = (typeof VALID_ORDER_VALUES)[number];
export type OrderBy = (typeof VALID_ORDER_BY_VALUES)[number];
