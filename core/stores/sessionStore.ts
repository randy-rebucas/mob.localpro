import { create } from 'zustand';

import { fetchCurrentUser } from '@/core/api/sessionRefresh';
import { setStoredRefreshToken } from '@/core/lib/authTokens';
import { useCsrfTokenStore } from '@/core/stores/csrfTokenStore';
import type { User } from '@/core/types/models';

type SessionState = {
  user: User | null;
  hydrated: boolean;
  bootstrap: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  clearSession: () => Promise<void>;
};

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  hydrated: false,
  setUser: (user) => set({ user }),
  bootstrap: async () => {
    const user = await fetchCurrentUser();
    set({ user, hydrated: true });
  },
  refreshUser: async () => {
    const user = await fetchCurrentUser();
    set({ user });
  },
  clearSession: async () => {
    await setStoredRefreshToken(null);
    useCsrfTokenStore.getState().setToken(null);
    set({ user: null });
  },
}));
