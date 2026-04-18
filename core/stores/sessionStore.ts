import { create } from 'zustand';

import type { User } from '@/core/types/models';

type SessionState = {
  user: User | null;
  hydrated: boolean;
  setUser: (user: User | null) => void;
  clearSession: () => Promise<void>;
  setHydrated: (v: boolean) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  user: null,
  hydrated: false,
  setUser: (user) => set({ user }),
  clearSession: async () => {
    set({ user: null });
  },
  setHydrated: (hydrated) => set({ hydrated }),
}));
