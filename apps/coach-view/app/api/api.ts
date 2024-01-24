import { cookies } from 'next/headers';

export const BASE_URL = 'http://localhost:8001';

const getCurrentUser = () => {
  const cookie = cookies().get('user')?.value || '{}';
  return JSON.parse(cookie);
};

export const makeHeaders = () => {
  const user = getCurrentUser();

  return new Headers({
    ...(!!user && { Authorization: `Bearer ${user.accessToken}` }),
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'http://localhost:8001',
  });
};
