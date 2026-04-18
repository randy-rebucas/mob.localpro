import { API } from '@/core/api/endpoints';
import { userFromApi } from '@/core/api/normalize';
import { api } from '@/core/api/client';
import { fetchCurrentUser, refreshSessionRequest } from '@/core/api/sessionRefresh';
import { setStoredRefreshToken } from '@/core/lib/authTokens';
import type { User } from '@/core/types/models';
import { useSessionStore } from '@/core/stores/sessionStore';

type UnknownRecord = Record<string, unknown>;

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  role: 'client' | 'provider';
};

export const authService = {
  async refreshSession(): Promise<void> {
    const user = await refreshSessionRequest();
    if (user) {
      useSessionStore.getState().setUser(user);
    }
  },

  async fetchMe(): Promise<User | null> {
    return fetchCurrentUser();
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
      await setStoredRefreshToken(data.refreshToken);
    }
    useSessionStore.getState().setUser(user);
    return user;
  },

  async register(input: RegisterInput): Promise<{ message?: string }> {
    const { data } = await api.post<{ message?: string }>(API.auth.register, {
      name: input.name.trim(),
      email: input.email.trim(),
      password: input.password,
      role: input.role,
    });
    return data;
  },

  async forgotPassword(email: string): Promise<{ message?: string }> {
    const { data } = await api.post<{ message?: string }>(API.auth.forgotPassword, { email: email.trim() });
    return data;
  },

  async resetPassword(token: string, password: string): Promise<{ message?: string }> {
    const { data } = await api.post<{ message?: string }>(API.auth.resetPassword, {
      token: token.trim(),
      password,
    });
    return data;
  },

  async verifyEmail(token: string): Promise<{ message?: string }> {
    const { data } = await api.post<{ message?: string }>(API.auth.verifyEmail, { token: token.trim() });
    return data;
  },

  async sendPhoneOtp(phone: string): Promise<{ message?: string }> {
    const { data } = await api.post<{ message?: string }>(API.auth.phoneSend, { phone: phone.trim() });
    return data;
  },

  async verifyPhoneOtp(phone: string, code: string): Promise<User> {
    const { data } = await api.post<{ user?: UnknownRecord; message?: string }>(API.auth.phoneVerify, {
      phone: phone.trim(),
      code: code.trim(),
    });
    if (!data.user) {
      throw new Error(data.message ?? 'Verification failed');
    }
    const user = userFromApi(data.user);
    useSessionStore.getState().setUser(user);
    return user;
  },

  async logout(): Promise<void> {
    try {
      await api.post(API.auth.logout);
    } catch {
      // still clear local session
    }
    await useSessionStore.getState().clearSession();
  },
};
