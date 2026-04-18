import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastHost } from '@/components/ToastHost';
import { useOnlineManager } from '@/core/hooks/useOnlineManager';
import { useAppStreams } from '@/core/realtime/useAppStreams';
import { PushNotificationsManager } from '@/providers/PushNotificationsManager';

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 10 * 60_000,
            retry: 2,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  useOnlineManager();
  useAppStreams(
    (payload) => {
      try {
        const data = JSON.parse(payload) as Record<string, unknown>;
        if (data[':heartbeat'] === true || data[':heartbeat'] === 'true') return;
        if (data.__event === 'status_update') {
          void queryClient.invalidateQueries({ queryKey: ['jobs'] });
          const id = typeof data.entityId === 'string' ? data.entityId : undefined;
          if (id) void queryClient.invalidateQueries({ queryKey: ['jobs', id] });
          return;
        }
      } catch {
        /* non-JSON ping */
      }
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    () => {
      void queryClient.invalidateQueries({ queryKey: ['messages', 'threads'] });
      void queryClient.invalidateQueries({ queryKey: ['messages', 'unread'] });
    }
  );

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PushNotificationsManager>
          {children}
          <ToastHost />
        </PushNotificationsManager>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
