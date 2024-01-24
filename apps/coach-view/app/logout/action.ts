'use server';
import { cookies } from 'next/headers';

export const logout = () => {
  console.log('bye');
  cookies().delete('user');
};
