import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

import { ToastHost } from '@/components/ToastHost';
import { useOnlineManager } from '@/core/hooks/useOnlineManager';
import { useAppStreams } from '@/core/realtime/useAppStreams';

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
    () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    () => {
      void queryClient.invalidateQueries({ queryKey: ['messages', 'threads'] });
    }
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ToastHost />
    </QueryClientProvider>
  );
}
