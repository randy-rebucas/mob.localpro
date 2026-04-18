import { useRouter, useRootNavigationState, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { type ReactNode, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useSessionStore } from '@/core/stores/sessionStore';

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();
  const hydrated = useSessionStore((s) => s.hydrated);
  const user = useSessionStore((s) => s.user);
  const bootStarted = useRef(false);

  useEffect(() => {
    if (bootStarted.current) return;
    bootStarted.current = true;
    void (async () => {
      await useSessionStore.getState().bootstrap();
      await SplashScreen.hideAsync().catch(() => {});
    })();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        void useSessionStore.getState().refreshUser();
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!hydrated || !navState?.key) return;

    const root = segments[0];
    const inAuth = root === '(auth)';
    const inGuestShell = root === '(tabs)' || root === '(miniapps)';

    if (!user && inGuestShell) {
      router.replace('/login');
    } else if (user && inAuth) {
      router.replace('/(tabs)');
    }
  }, [hydrated, navState?.key, router, segments, user]);

  return <>{children}</>;
}
