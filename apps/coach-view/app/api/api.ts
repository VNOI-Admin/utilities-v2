import { cookies } from 'next/headers';

export const BASE_URL = 'http://localhost:8001';

const getCurrentUser = () => cookies().get('user');

export const makeHeaders = () => {
  const user = getCurrentUser();
  return new Headers({
    ...(!!user && { Authorization: `Bearer ${user.name}` }),
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': 'http://localhost:8001',
  });
};
