import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import EventSource from 'react-native-sse';

import { API } from '@/core/api/endpoints';
import { API_BASE_URL } from '@/core/constants/env';

/**
 * Subscribes to `/api/messages/stream/[threadId]` while the screen is mounted.
 * Invalidates thread + thread list when a new event arrives.
 */
export function useThreadMessageStream(threadId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!threadId?.trim()) return;
    if (!API_BASE_URL || API_BASE_URL.includes('localhost')) return;

    const url = `${API_BASE_URL}${API.messages.stream(threadId)}`;
    const es = new EventSource(url, { withCredentials: true });

    es.addEventListener('message', (e) => {
      if ('data' in e && typeof e.data === 'string' && e.data.trim()) {
        void qc.invalidateQueries({ queryKey: ['messages', 'thread', threadId] });
        void qc.invalidateQueries({ queryKey: ['messages', 'threads'] });
        void qc.invalidateQueries({ queryKey: ['messages', 'unread'] });
      }
    });

    return () => {
      es.close();
    };
  }, [qc, threadId]);
}
