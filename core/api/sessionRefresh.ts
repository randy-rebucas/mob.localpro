import axios from 'axios';

import { API } from '@/core/api/endpoints';
import { userFromApi } from '@/core/api/normalize';
import { API_BASE_URL } from '@/core/constants/env';
import { getStoredRefreshToken } from '@/core/lib/authTokens';
import type { User } from '@/core/types/models';

type UnknownRecord = Record<string, unknown>;

/**
 * Current user from cookies only (no `api` instance) so `sessionStore` can bootstrap
 * without creating an import cycle with the axios client.
 */
export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const { data } = await axios.get<UnknownRecord>(`${API_BASE_URL}${API.auth.me}`, {
      withCredentials: true,
      headers: { Accept: 'application/json' },
    });
    if (!data || typeof data !== 'object') {
      return null;
    }
    return userFromApi(data);
  } catch {
    return null;
  }
}

/**
 * Refresh session (cookies + optional body token). Uses a bare client to avoid circular imports with `api`.
 * When the API returns a refresh token at login, it is sent here for backends that accept body + cookies.
 */
export async function refreshSessionRequest(): Promise<User | undefined> {
  const refreshToken = await getStoredRefreshToken();
  const body = refreshToken ? { refreshToken } : {};
  await axios.post(`${API_BASE_URL}${API.auth.refresh}`, body, {
    withCredentials: true,
    headers: {
      Accept: 'application/json',
      ...(refreshToken ? { 'Content-Type': 'application/json' } : {}),
    },
  });

  const user = await fetchCurrentUser();
  return user ?? undefined;
}
