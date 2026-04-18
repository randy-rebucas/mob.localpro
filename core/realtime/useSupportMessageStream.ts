import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import EventSource from 'react-native-sse';

import { API } from '@/core/api/endpoints';
import { API_BASE_URL } from '@/core/constants/env';

/**
 * Subscribes to `/api/support/stream` while mounted; invalidates the support thread query on events.
 */
export function useSupportMessageStream(enabled: boolean) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    if (!API_BASE_URL || API_BASE_URL.includes('localhost')) return;

    const url = `${API_BASE_URL}${API.support.stream}`;
    const es = new EventSource(url, { withCredentials: true });

    es.addEventListener('message', (e) => {
      if ('data' in e && typeof e.data === 'string' && e.data.trim()) {
        void qc.invalidateQueries({ queryKey: ['support', 'thread'] });
      }
    });

    return () => {
      es.close();
    };
  }, [enabled, qc]);
}
