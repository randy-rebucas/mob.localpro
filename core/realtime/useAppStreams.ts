import { useEffect, useRef } from 'react';
import EventSource from 'react-native-sse';

import { API } from '@/core/api/endpoints';
import { API_BASE_URL } from '@/core/constants/env';

const MAX_SSE_RECONNECT = 5;
const BASE_SSE_MS = 1000;

function attachReconnectingStream(
  url: string,
  onData: (data: string) => void,
  getCancelled: () => boolean
): () => void {
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let es: InstanceType<typeof EventSource> | null = null;

  const clearTimer = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const connect = () => {
    if (getCancelled()) return;
    clearTimer();
    es?.close();
    es = new EventSource(url, { withCredentials: true });

    es.addEventListener('message', (e) => {
      if ('data' in e && typeof e.data === 'string') {
        reconnectAttempt = 0;
        onData(e.data);
      }
    });

    es.addEventListener('error', () => {
      es?.close();
      es = null;
      if (getCancelled()) return;
      if (reconnectAttempt >= MAX_SSE_RECONNECT) return;
      const delay = Math.min(30_000, BASE_SSE_MS * Math.pow(2, reconnectAttempt));
      reconnectAttempt += 1;
      reconnectTimer = setTimeout(connect, delay);
    });
  };

  connect();

  return () => {
    clearTimer();
    es?.close();
    es = null;
  };
}

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
