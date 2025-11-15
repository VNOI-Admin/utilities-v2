import { authClient } from './api';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const response = await authClient.post<LoginResponse>('/auth/login', credentials);
    return response.data;
  },

  async logout(): Promise<void> {
    await authClient.post('/auth/logout');
  },

  async checkAuth(): Promise<boolean> {
    try {
      await authClient.get('/auth/me');
      return true;
    } catch {
      return false;
    }
  },

  async getCurrentUser(): Promise<{ username: string; role: string }> {
    const response = await authClient.get('/auth/me');
    return response.data;
  },

  async refresh(): Promise<LoginResponse> {
    const response = await authClient.post<LoginResponse>('/auth/refresh');
    return response.data;
  },
};
