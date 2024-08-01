import getEnv from '~/common/getEnv';
import { UserApi } from '@libs/api/user';

const USER_ENDPOINT = getEnv('VITE_APP_USER_ENDPOINT');
const AUTH_ENDPOINT = getEnv('VITE_APP_AUTH_ENDPOINT');
const INTERNAL_ENDPOINT = getEnv('VITE_APP_INTERNAL_ENDPOINT');

export const userApi = new UserApi({
  baseURL: USER_ENDPOINT,
  withCredentials: true,
});

export const authApi = new UserApi({
  baseURL: AUTH_ENDPOINT,
  withCredentials: true,
});

export const internalApi = new UserApi({
  baseURL: INTERNAL_ENDPOINT,
  withCredentials: true,
});
