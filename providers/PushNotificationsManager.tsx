import * as Notifications from 'expo-notifications';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { useQueryClient } from '@tanstack/react-query';
import { type ReactNode, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import { notificationDataToHref, parsePushNotificationData } from '@/core/notifications/navigateFromNotificationData';
import { notificationService } from '@/core/services/notificationService';
import { useSessionStore } from '@/core/stores/sessionStore';
import { useToastStore } from '@/core/stores/toastStore';
import { router } from 'expo-router';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

function expoProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  const fromExtra = extra?.eas?.projectId?.trim();
  const fromEasConfig = (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId?.trim();
  return fromExtra || fromEasConfig || undefined;
}

/** Expo Go cannot obtain Expo push tokens (SDK 53+); use an EAS development or production build. */
function isExpoGoClient(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}

function navigateFromPushData(data: Record<string, unknown>) {
  const parsed = parsePushNotificationData(data);
  const href = notificationDataToHref(parsed);
  if (href) {
    router.push(href as never);
  }
}

export function PushNotificationsManager({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const user = useSessionStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);
  const lastRegisteredToken = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    void (async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.DEFAULT,
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || !user) {
      lastRegisteredToken.current = null;
      return;
    }

    let cancelled = false;

    void (async () => {
      if (!Device.isDevice) return;

      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;
      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted' || cancelled) return;

      if (isExpoGoClient()) {
        console.warn(
          '[push] register skipped: Expo Go does not support remote push (SDK 53+). Use `npx expo run:android` / `expo run:ios` or an EAS development build. https://docs.expo.dev/develop/development-builds/introduction/'
        );
        return;
      }

      const projectId = expoProjectId();
      if (!projectId) {
        console.warn(
          '[push] register skipped: no EAS project id. Run `npx eas-cli@latest init`, or set EAS_PROJECT_ID in .env, or add expo.extra.eas.projectId in app.json (see app.config.js).'
        );
        return;
      }

      try {
        const token = await Notifications.getExpoPushTokenAsync({ projectId }).then((r) => r.data);

        if (cancelled || !token || token === lastRegisteredToken.current) return;

        await notificationService.registerPushToken(token);
        lastRegisteredToken.current = token;
      } catch (e) {
        // Backend route, network, etc. — do not block the app.
        console.warn('[push] register skipped:', e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (Platform.OS === 'web' || !user) return;

    const foreground = Notifications.addNotificationReceivedListener((n) => {
      const title = n.request.content.title;
      const body = n.request.content.body;
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (title || body) {
        showToast([title, body].filter(Boolean).join(' — ') || 'New notification');
      }
    });

    const response = Notifications.addNotificationResponseReceivedListener((res) => {
      const data = res.notification.request.content.data as Record<string, unknown>;
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      navigateFromPushData(data);
    });

    return () => {
      foreground.remove();
      response.remove();
    };
  }, [queryClient, showToast, user?.id]);

  useEffect(() => {
    if (Platform.OS === 'web' || !user) return;

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      }
    });
    return () => sub.remove();
  }, [queryClient, user?.id]);

  return <>{children}</>;
}
