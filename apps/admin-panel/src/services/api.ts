import { AuthApi } from '@libs/api/auth';
import { InternalApi } from '@libs/api/internal';
import { PrintingApi } from '@libs/api/printing';
import { UserApi } from '@libs/api/user';
import getEnv from '~/common/getEnv';

const USER_ENDPOINT = getEnv('VITE_APP_USER_ENDPOINT');
const AUTH_ENDPOINT = getEnv('VITE_APP_AUTH_ENDPOINT');
const INTERNAL_ENDPOINT = getEnv('VITE_APP_INTERNAL_ENDPOINT');
const PRINTING_ENDPOINT = getEnv('VITE_APP_PRINTING_ENDPOINT');

export const userApi = new UserApi({
  baseURL: USER_ENDPOINT,
  withCredentials: true,
});

export const authApi = new AuthApi({
  baseURL: AUTH_ENDPOINT,
  withCredentials: true,
});

export const internalApi = new InternalApi({
  baseURL: INTERNAL_ENDPOINT,
  withCredentials: true,
});

export const printingApi = new PrintingApi({
  baseURL: PRINTING_ENDPOINT,
  withCredentials: true,
});
