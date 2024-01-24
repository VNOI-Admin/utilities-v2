'use server';
import { permanentRedirect, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { BASE_URL, makeHeaders } from '../api/api';

export const logout = async () => {
  try {
    const res = await fetch(new URL('/auth/logout', BASE_URL), {
      method: 'POST',
      headers: makeHeaders(),
      body: null,
    });

    if (res.status !== 201) {
      throw new Error('Something went wrong');
    }
  } catch (e) {
    return {
      message: e.message,
    };
  }

  cookies().delete('user');
  redirect('login');
};
