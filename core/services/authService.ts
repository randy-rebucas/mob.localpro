import * as SecureStore from 'expo-secure-store';

import { api } from '@/core/api/client';
import { refreshSessionRequest } from '@/core/api/sessionRefresh';
import type { User } from '@/core/types/models';
import { useSessionStore } from '@/core/stores/sessionStore';

const REFRESH_TOKEN_KEY = 'localpro_refresh_token';

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
    const { data } = await api.post<{ user: User; refreshToken?: string }>('/api/auth/login', {
      email,
      password,
    });
    if (data.refreshToken) {
      await persistRefreshToken(data.refreshToken);
    }
    useSessionStore.getState().setUser(data.user);
    return data.user;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // still clear local session
    }
    await persistRefreshToken(null);
    await useSessionStore.getState().clearSession();
  },
};
