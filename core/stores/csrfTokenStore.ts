import { create } from 'zustand';

type CsrfTokenState = {
  token: string | null;
  setToken: (token: string | null) => void;
};

/** In-memory CSRF for native (Expo Go) when the API returns a token in JSON; web also uses `document.cookie` in `core/lib/csrf.ts`. */
export const useCsrfTokenStore = create<CsrfTokenState>((set) => ({
  token: null,
  setToken: (token) => set({ token }),
}));
