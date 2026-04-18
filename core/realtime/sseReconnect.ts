import EventSource from 'react-native-sse';

const MAX_SSE_RECONNECT = 5;
const BASE_SSE_MS = 1000;

/**
 * Opens an SSE connection with exponential backoff reconnect on errors.
 */
export function attachReconnectingStream(
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
