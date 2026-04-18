import { useEffect, useRef } from 'react';
import EventSource from 'react-native-sse';

import { API_BASE_URL } from '@/core/constants/env';

/**
 * Subscribes to global SSE channels when a non-local API URL is configured.
 */
export function useAppStreams(
  onNotification?: (payload: string) => void,
  onMessage?: (payload: string) => void
) {
  const notifRef = useRef(onNotification);
  const msgRef = useRef(onMessage);
  notifRef.current = onNotification;
  msgRef.current = onMessage;

  useEffect(() => {
    if (!API_BASE_URL || API_BASE_URL.includes('localhost')) {
      return;
    }

    const notificationsUrl = `${API_BASE_URL}/api/sse/notifications`;
    const messagesUrl = `${API_BASE_URL}/api/sse/messages`;

    const notifEs = new EventSource(notificationsUrl);
    const msgEs = new EventSource(messagesUrl);

    notifEs.addEventListener('message', (e) => {
      if ('data' in e && typeof e.data === 'string') {
        notifRef.current?.(e.data);
      }
    });

    msgEs.addEventListener('message', (e) => {
      if ('data' in e && typeof e.data === 'string') {
        msgRef.current?.(e.data);
      }
    });

    return () => {
      notifEs.close();
      msgEs.close();
    };
  }, []);
}
