/// <reference types="vite/client" />

declare module 'virtual:generated-layouts' {
  import { RouteRecordRaw } from 'vue-router';
  export function setupLayouts(routes: RouteRecordRaw[]): RouteRecordRaw[];
}

interface ImportMetaEnv {
  readonly VITE_USER_API_URL?: string;
  readonly VITE_AUTH_API_URL?: string;
  readonly VITE_PRINTING_API_URL?: string;
  readonly VITE_INTERNAL_API_URL?: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
  [key: string]: any;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
