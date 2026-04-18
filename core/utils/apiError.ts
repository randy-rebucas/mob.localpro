import axios from 'axios';

/** Best-effort message from API JSON or axios. */
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === 'object') {
      const msg = (data as Record<string, unknown>).message;
      if (typeof msg === 'string' && msg.trim()) {
        return msg;
      }
      const err = (data as Record<string, unknown>).error;
      if (typeof err === 'string' && err.trim()) {
        return err;
      }
    }
    if (typeof data === 'string' && data.trim()) {
      return data;
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
