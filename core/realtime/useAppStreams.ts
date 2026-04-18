import { useEffect, useRef } from 'react';

import { API } from '@/core/api/endpoints';
import { API_BASE_URL } from '@/core/constants/env';
import { attachReconnectingStream } from '@/core/realtime/sseReconnect';

/**
 * Subscribes to SSE when a non-local API URL is configured.
 * - Notifications: {@link API.notifications.stream} (with reconnect/backoff on errors)
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

    const cancelledRef = { current: false };

    const stopNotif = attachReconnectingStream(
      `${API_BASE_URL}${API.notifications.stream}`,
      (data) => notifRef.current?.(data),
      () => cancelledRef.current
    );

    let stopMsg: (() => void) | undefined;
    if (activeThreadId) {
      stopMsg = attachReconnectingStream(
        `${API_BASE_URL}${API.messages.stream(activeThreadId)}`,
        (data) => msgRef.current?.(data),
        () => cancelledRef.current
      );
    }

    return () => {
      cancelledRef.current = true;
      stopNotif();
      stopMsg?.();
    };
  }, [activeThreadId]);
}
