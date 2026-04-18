import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { API_BASE_URL } from '@/core/constants/env';
import { refreshSessionRequest } from '@/core/api/sessionRefresh';
import { useSessionStore } from '@/core/stores/sessionStore';

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig | undefined;
    const status = error.response?.status;

    if (!original || original._retry) {
      return Promise.reject(error);
    }

    if (status === 401 && !original.url?.includes('/api/auth/refresh')) {
      original._retry = true;
      try {
        const user = await refreshSessionRequest();
        if (user) {
          useSessionStore.getState().setUser(user);
        } else {
          await useSessionStore.getState().clearSession();
          return Promise.reject(error);
        }
        return api(original);
      } catch {
        await useSessionStore.getState().clearSession();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);
