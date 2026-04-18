import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { API } from '@/core/api/endpoints';
import { API_BASE_URL } from '@/core/constants/env';
import { attachReconnectingStream } from '@/core/realtime/sseReconnect';

/**
 * Subscribes to `/api/support/stream` while mounted; invalidates the support thread query on events.
 */
export function useSupportMessageStream(enabled: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    if (!API_BASE_URL || API_BASE_URL.includes('localhost')) return;

    const url = `${API_BASE_URL}${API.support.stream}`;
    const cancelledRef = { current: false };

    const stop = attachReconnectingStream(
      url,
      (data) => {
        if (!data.trim()) return;
        void qc.invalidateQueries({ queryKey: ['support', 'thread'] });
      },
      () => cancelledRef.current
    );

    return () => {
      cancelledRef.current = true;
      stop();
    };
  }, [enabled, qc]);
}
