import * as SecureStore from 'expo-secure-store';

import { API } from '@/core/api/endpoints';
import { userFromApi } from '@/core/api/normalize';
import { api } from '@/core/api/client';
import { refreshSessionRequest } from '@/core/api/sessionRefresh';
import type { User } from '@/core/types/models';
import { useSessionStore } from '@/core/stores/sessionStore';

const REFRESH_TOKEN_KEY = 'localpro_refresh_token';

type UnknownRecord = Record<string, unknown>;

async function persistRefreshToken(token: string | null) {
  if (token) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }
}

export const authService = {
  async refreshSession(): Promise<void> {
    const user = await refreshSessionRequest();
    if (user) {
      useSessionStore.getState().setUser(user);
    }
  },

  async login(email: string, password: string): Promise<User> {
    const { data } = await api.post<{ user?: UnknownRecord; refreshToken?: string; message?: string }>(API.auth.login, {
      email,
      password,
    });
    if (!data.user) {
      throw new Error(data.message ?? 'Login failed');
    }
    const user = userFromApi(data.user);
    if (data.refreshToken) {
      await persistRefreshToken(data.refreshToken);
    }
    useSessionStore.getState().setUser(user);
    return user;
  },

  async logout(): Promise<void> {
    try {
      await api.post(API.auth.logout);
    } catch {
      // still clear local session
    }
    await persistRefreshToken(null);
    await useSessionStore.getState().clearSession();
  },
};
