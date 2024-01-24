'use server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { post } from '../api/api';

export const logout = async () => {
  try {
    await post('/auth/logout', null);
  } catch (e) {
    return {
      message: e.message,
    };
  }

  cookies().delete('user');
  redirect('login');
};
