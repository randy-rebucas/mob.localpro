import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { API } from '@/core/api/endpoints';
import { API_BASE_URL } from '@/core/constants/env';
import { attachReconnectingStream } from '@/core/realtime/sseReconnect';

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
    const cancelledRef = { current: false };

    const stop = attachReconnectingStream(
      url,
      (data) => {
        if (!data.trim()) return;
        void qc.invalidateQueries({ queryKey: ['messages', 'thread', threadId] });
        void qc.invalidateQueries({ queryKey: ['messages', 'threads'] });
        void qc.invalidateQueries({ queryKey: ['messages', 'unread'] });
      },
      () => cancelledRef.current
    );

    return () => {
      cancelledRef.current = true;
      stop();
    };
  }, [qc, threadId]);
}
