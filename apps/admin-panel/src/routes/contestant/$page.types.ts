import type {
  VALID_ORDER_BY_VALUES,
  VALID_ORDER_BY_VALUES_ADMIN,
  VALID_ORDER_VALUES,
} from "./$page.constants";

export interface Device {
  username: string;
  fullName: string;
  role: string;
  isActive: boolean;
  isOnline: boolean;
  lastReportedAt: string;
  vpnIpAddress?: string;
  cpu?: number;
  memory?: number;
  disk?: number;
  ping?: number;
}

export type DeviceInfoKeys = keyof Device;
export type Order = (typeof VALID_ORDER_VALUES)[number];
export type OrderBy =
  | (typeof VALID_ORDER_BY_VALUES)[number]
  | (typeof VALID_ORDER_BY_VALUES_ADMIN)[number];

