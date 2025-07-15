import Cookies from 'js-cookie';
import { authApi } from './api';

export async function authenticated() {
  try {
    Cookies.set('accessToken', 'UNAUTHENTICATED');

    if (Cookies.get('accessToken') === 'UNAUTHENTICATED') {
      Cookies.remove('accessToken');

      Cookies.set('refreshToken', 'UNAUTHENTICATED');
      if (Cookies.get('refreshToken') === 'UNAUTHENTICATED') {
        Cookies.remove('refreshToken');
        return false;
      } else {
        try {
          await authApi.auth.refresh();
          return true;
        } catch (error) {
          return false;
        }
      }
    } else {
      return true;
    }
  } catch (error) {
    console.error(error);
    return false;
  }
}
