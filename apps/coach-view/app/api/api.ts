'use server';

import { cookies } from 'next/headers';

const BASE_URL = process.env.API_ENDPOINT || 'http://localhost:8001';

const getCurrentUser = () => {
  const cookie = cookies().get('user')?.value || '{}';
  return JSON.parse(cookie);
};

const makeHeaders = () => {
  const user = getCurrentUser();

  return new Headers({
    ...(!!user && { Authorization: `Bearer ${user.accessToken}` }),
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': BASE_URL,
  });
};

export const get = async (path: string) => {
  try {
    const res = await fetch(new URL(`${path}`, BASE_URL), {
      method: 'GET',
      headers: makeHeaders(),
    });

    return await res.json();
  } catch (e) {
    throw new Error(e.message);
  }
};

export const post = async (path: string, body: any) => {
  try {
    const res = await fetch(new URL(`${path}`, BASE_URL), {
      method: 'POST',
      headers: makeHeaders(),
      body: body ? JSON.stringify(body) : null,
    });

    if (res.status !== 201) {
      throw new Error('Something went wrong');
    }

    return res;
  } catch (e) {
    console.error(e);
    throw new Error(e.message);
  }
};
