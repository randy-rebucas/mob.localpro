import axios from 'axios';

import { API } from '@/core/api/endpoints';
import { userFromApi } from '@/core/api/normalize';
import { API_BASE_URL } from '@/core/constants/env';
import type { User } from '@/core/types/models';

type UnknownRecord = Record<string, unknown>;

/** Cookie-only refresh; uses a bare client to avoid circular imports with `api`. */
export async function refreshSessionRequest(): Promise<User | undefined> {
  await axios.post(`${API_BASE_URL}${API.auth.refresh}`, {}, {
    withCredentials: true,
    headers: { Accept: 'application/json' },
  });

  const { data } = await axios.get<UnknownRecord>(`${API_BASE_URL}${API.auth.me}`, {
    withCredentials: true,
    headers: { Accept: 'application/json' },
  });

  return userFromApi(data);
}
