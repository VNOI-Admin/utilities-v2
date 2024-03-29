import type { ChartConfiguration, ChartType, DefaultDataPoint } from "chart.js";

import type { COLOR_SCHEMES } from "./constants";

export type ColorScheme = (typeof COLOR_SCHEMES)[number];

export interface UserTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserData {
  username: string;
  vpnIpAddress: string;
  fullName: string;
  role: string;
  isActive: boolean;
  machineUsage: {
    cpu: number;
    memory: number;
    disk: number;
    ping: number;
    isOnline: boolean;
    lastReportedAt: string;
  };
}

export type User = {
  token: UserTokens;
  data: UserData;
};

export type ChartWorkerEvent<
  TChart extends string,
  TType extends ChartType = ChartType,
  TData extends unknown[] = DefaultDataPoint<TType>,
  TLabel = unknown,
> = { chartType: TChart } & (
  | {
      type: "__INIT_CHART__";
      canvas: OffscreenCanvas;
      width: number;
      height: number;
      config: ChartConfiguration<TType, TData, TLabel>;
    }
  | {
      type: "__UPDATE_CHART__";
      newData: TData[number];
    }
  | {
      type: "__UPDATE_SCHEME__";
      colorScheme: ColorScheme;
    }
  | {
      type: "__RESIZE_CHART__";
      newWidth: number;
      newHeight: number;
    }
  | {
      type: "__DESTROY_CHART__";
    }
);

export type CpuRamChartType = "cpu" | "ram";

export type CpuRamChartWorkerEvent = ChartWorkerEvent<CpuRamChartType, "line", number[], string>;

export type RequireKeys<T, U extends keyof T> = T & Required<Pick<T, U>>;

export type ToastVariant = "error" | "success" | "warning" | "info";

export interface ToastItem {
  variant: ToastVariant;
  time: number;
  title: string;
  message: string;
}
