'use server';
import { cookies } from 'next/headers';

import { BASE_URL, makeHeaders } from '../api/api';
import type { LoginFormState } from './types';
import { redirect } from 'next/navigation';

export const login = async (
  oldState: LoginFormState,
  formData: FormData,
): Promise<LoginFormState> => {
  try {
    const cookiesStore = cookies();
    const username = formData.get('username');
    const password = formData.get('password');
    if (typeof username !== 'string') {
      return {
        ...oldState,
        usernameMessages: [...oldState.usernameMessages, 'Username is not valid!'],
      };
    }
    if (typeof password !== 'string') {
      return {
        ...oldState,
        passwordMessages: [...oldState.passwordMessages, 'Password is not valid!'],
      };
    }
    const res = await fetch(new URL('/auth/login', BASE_URL), {
      method: 'POST',
      headers: makeHeaders(),
      body: JSON.stringify({ username, password }),
    });

    if (res.status !== 201) {
      throw new Error('Invalid credentials');
    }

    cookiesStore.set({
      name: 'user',
      value: JSON.stringify(await res.json()),
      httpOnly: true,
      sameSite: 'strict',
      secure: true,
      path: '/',
    });
  } catch (e) {
    console.error(e);
    return {
      ...oldState,
      // messages: ['An internal server error occurred'],
      messages: [e.message],
    };
  }

  redirect('/');
};
