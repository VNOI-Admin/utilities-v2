import { cookies } from 'next/headers';

export const BASE_URL = 'http://localhost:8001';

const getCurrentUser = () => cookies().get('user');

export const makeHeaders = () => {
  const user = JSON.parse(getCurrentUser().value);

  return new Headers({
    ...(!!user && { Authorization: `Bearer ${user.accessToken}` }),
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'http://localhost:8001',
  });
};
