import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import { API } from '@/core/api/endpoints';
import { refreshSessionRequest } from '@/core/api/sessionRefresh';
import { API_BASE_URL } from '@/core/constants/env';
import {
  captureCsrfTokenFromAxiosSuccess,
  captureCsrfTokenFromJsonBody,
  captureCsrfTokenFromResponseHeaders,
  csrfHeaderFields,
} from '@/core/lib/csrf';
import { useSessionStore } from '@/core/stores/sessionStore';

declare module 'axios' {
  export interface InternalAxiosRequestConfig {
    _retry?: boolean;
  }
}

function isFormDataLike(body: unknown): boolean {
  return (
    (typeof FormData !== 'undefined' && body instanceof FormData) ||
    (body !== null &&
      typeof body === 'object' &&
      typeof (body as { append?: unknown }).append === 'function')
  );
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const body = config.data;
  const isFormData =
    (typeof FormData !== 'undefined' && body instanceof FormData) ||
    (body !== null &&
      typeof body === 'object' &&
      typeof (body as { append?: unknown }).append === 'function');

  if (isFormData) {
    const headers = config.headers;
    if (headers && typeof headers.delete === 'function') {
      headers.delete('Content-Type');
      headers.delete('content-type');
    } else if (headers && typeof headers === 'object') {
      delete (headers as Record<string, unknown>)['Content-Type'];
      delete (headers as Record<string, unknown>)['content-type'];
    }
  }

  const method = (config.method ?? 'get').toLowerCase();
  if (method !== 'get' && method !== 'head' && method !== 'options') {
    const csrf = await csrfHeaderFields();
    for (const [key, value] of Object.entries(csrf)) {
      if (!value) continue;
      const headers = config.headers;
      if (headers && typeof (headers as { set?: (k: string, v: string) => void }).set === 'function') {
        (headers as { set: (k: string, v: string) => void }).set(key, value);
      } else if (headers && typeof headers === 'object') {
        (headers as Record<string, string>)[key] = value;
      }
    }
  }

  return config;
});

api.interceptors.response.use(
  (res) => {
    captureCsrfTokenFromAxiosSuccess(res);
    return res;
  },
  async (error: AxiosError) => {
    if (error.response?.headers) {
      captureCsrfTokenFromResponseHeaders(error.response.headers);
    }
    const status = error.response?.status;
    if (status === 419) {
      captureCsrfTokenFromJsonBody(error.response?.data);
    }
    const original = error.config as InternalAxiosRequestConfig | undefined;

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
        if (isFormDataLike(original.data)) {
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
