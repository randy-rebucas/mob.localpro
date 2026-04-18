import { useEffect, useRef } from 'react';
import EventSource from 'react-native-sse';

import { API } from '@/core/api/endpoints';
import { API_BASE_URL } from '@/core/constants/env';

/**
 * Subscribes to SSE when a non-local API URL is configured.
 * - Notifications: {@link API.notifications.stream}
 * - Messages: {@link API.messages.stream} (per `threadId`, when provided)
 */
export function useAppStreams(
  onNotification?: (payload: string) => void,
  onMessage?: (payload: string) => void,
  activeThreadId?: string | null
) {
  const notifRef = useRef(onNotification);
  const msgRef = useRef(onMessage);
  notifRef.current = onNotification;
  msgRef.current = onMessage;

  useEffect(() => {
    if (!API_BASE_URL || API_BASE_URL.includes('localhost')) {
      return;
    }

    const notificationsUrl = `${API_BASE_URL}${API.notifications.stream}`;
    const notifEs = new EventSource(notificationsUrl, { withCredentials: true });

    notifEs.addEventListener('message', (e) => {
      if ('data' in e && typeof e.data === 'string') {
        notifRef.current?.(e.data);
      }
    });

    let msgEs: InstanceType<typeof EventSource> | null = null;
    if (activeThreadId) {
      const messagesUrl = `${API_BASE_URL}${API.messages.stream(activeThreadId)}`;
      msgEs = new EventSource(messagesUrl, { withCredentials: true });
      msgEs.addEventListener('message', (e) => {
        if ('data' in e && typeof e.data === 'string') {
          msgRef.current?.(e.data);
        }
      });
    }

    return () => {
      notifEs.close();
      msgEs?.close();
    };
  }, [activeThreadId]);
}
