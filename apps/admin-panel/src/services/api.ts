import axios, { type AxiosInstance } from 'axios';
import getEnv from '~/common/getEnv';
import { InternalApi } from '@libs/api/internal';
import { PrintingApi } from '@libs/api/printing';

// Create axios instances for each service
const AUTH_ENDPOINT = getEnv('VITE_APP_AUTH_ENDPOINT') || 'http://localhost:8002';
const USER_ENDPOINT = getEnv('VITE_APP_USER_ENDPOINT') || 'http://localhost:8001';
const INTERNAL_ENDPOINT = getEnv('VITE_APP_INTERNAL_ENDPOINT') || 'http://localhost:8003';
const PRINTING_ENDPOINT = getEnv('VITE_APP_PRINTING_ENDPOINT') || 'http://localhost:8004';

export const authClient: AxiosInstance = axios.create({
  baseURL: AUTH_ENDPOINT,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const userClient: AxiosInstance = axios.create({
  baseURL: USER_ENDPOINT,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const internalClient: AxiosInstance = axios.create({
  baseURL: INTERNAL_ENDPOINT,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const printingClient: AxiosInstance = axios.create({
  baseURL: PRINTING_ENDPOINT,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
[authClient, userClient, internalClient, printingClient].forEach((client) => {
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // Only redirect if not already on login page
        const currentPath = window.location.pathname;
        if (currentPath !== '/login') {
          // Redirect to login on unauthorized
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );
});

// Create typed API client instance
export const internalApi = new InternalApi({
  baseURL: INTERNAL_ENDPOINT,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Apply the same error handling interceptor to the InternalApi instance
internalApi.instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Create typed Printing API client instance
export const printingApi = new PrintingApi({
  baseURL: PRINTING_ENDPOINT,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Apply the same error handling interceptor to the PrintingApi instance
printingApi.instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
