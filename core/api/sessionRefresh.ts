import axios from 'axios';

import { API_BASE_URL } from '@/core/constants/env';
import type { User } from '@/core/types/models';

/** Cookie-only refresh; uses a bare client to avoid circular imports with `api`. */
export async function refreshSessionRequest(): Promise<User | undefined> {
  const { data } = await axios.post<{ user?: User }>(
    `${API_BASE_URL}/api/auth/refresh`,
    {},
    {
      withCredentials: true,
      headers: { Accept: 'application/json' },
    }
  );
  return data.user;
}
