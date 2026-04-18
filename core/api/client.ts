import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { API } from '@/core/api/endpoints';
import { refreshSessionRequest } from '@/core/api/sessionRefresh';
import { API_BASE_URL } from '@/core/constants/env';
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

api.interceptors.request.use((config) => {
  const body = config.data;
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    const headers = config.headers;
    if (headers && typeof headers.delete === 'function') {
      headers.delete('Content-Type');
    } else if (headers && typeof headers === 'object') {
      delete (headers as Record<string, unknown>)['Content-Type'];
      delete (headers as Record<string, unknown>)['content-type'];
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig | undefined;
    const status = error.response?.status;

    if (!original || original._retry) {
      return Promise.reject(error);
    }

    if (status === 401 && !original.url?.includes(API.auth.refresh)) {
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
