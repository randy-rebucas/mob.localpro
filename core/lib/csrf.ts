import { Platform } from 'react-native';

import { useCsrfTokenStore } from '@/core/stores/csrfTokenStore';

/** Cookie names commonly used for double-submit CSRF (order = preference). */
const CSRF_COOKIE_NAMES = [
  'x-csrf-token',
  'csrf-token',
  'csrfToken',
  '_csrf',
  'ctoken',
  'XSRF-TOKEN',
  'xsrf-token',
  '__Host-next-auth.csrf-token',
  '__Secure-next-auth.csrf-token',
];

function decodeCookieValue(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function readWebCookieMap(): Record<string, string> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return {};
  }
  const out: Record<string, string> = {};
  for (const part of document.cookie.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name) out[name] = value;
  }
  return out;
}

function pickCsrfFromCookieMap(map: Record<string, string>): string | undefined {
  for (const want of CSRF_COOKIE_NAMES) {
    const v = map[want];
    if (v) return decodeCookieValue(v);
  }
  const lowerEntries = Object.entries(map).map(([k, v]) => [k.toLowerCase(), v] as const);
  const lowerMap = Object.fromEntries(lowerEntries);
  for (const want of CSRF_COOKIE_NAMES) {
    const v = lowerMap[want.toLowerCase()];
    if (v) return decodeCookieValue(v);
  }
  return undefined;
}

/** Sync read from `document.cookie` (web only). */
export function getCsrfTokenFromWebCookies(): string | undefined {
  return pickCsrfFromCookieMap(readWebCookieMap());
}

const JSON_CSRF_KEYS = ['csrfToken', 'csrf', '_csrf', 'xsrfToken', 'xsrf', 'csrf_token'] as const;

/** Response header names that sometimes carry the next double-submit token (case-insensitive). */
const CSRF_RESPONSE_HEADER_NAMES = ['x-csrf-token', 'x-xsrf-token', 'csrf-token'] as const;

function trimToken(v: string | undefined | null): string | undefined {
  const t = typeof v === 'string' ? v.trim() : '';
  return t ? t : undefined;
}

/**
 * Reads a CSRF token from Axios headers, fetch `Headers`, or a plain record (RN adapters vary).
 * For browser `fetch` cross-origin responses, the server must list these names in
 * `Access-Control-Expose-Headers` or the client cannot read them.
 */
export function captureCsrfTokenFromResponseHeaders(headers: unknown): void {
  if (headers == null) return;

  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    for (const name of CSRF_RESPONSE_HEADER_NAMES) {
      const v = trimToken(headers.get(name) ?? headers.get(name.toLowerCase()));
      if (v) {
        useCsrfTokenStore.getState().setToken(v);
        return;
      }
    }
    return;
  }

  const h = headers as Record<string, unknown> & { get?: (key: string) => unknown };
  if (typeof h.get === 'function') {
    for (const name of CSRF_RESPONSE_HEADER_NAMES) {
      const raw = h.get(name) ?? h.get(name.toLowerCase());
      const v = trimToken(typeof raw === 'string' ? raw : Array.isArray(raw) ? String(raw[0]) : undefined);
      if (v) {
        useCsrfTokenStore.getState().setToken(v);
        return;
      }
    }
  }

  const rec = headers as Record<string, string | string[] | undefined>;
  for (const name of CSRF_RESPONSE_HEADER_NAMES) {
    for (const key of [name, name.toLowerCase(), name.toUpperCase()]) {
      const raw = rec[key];
      const v = trimToken(Array.isArray(raw) ? raw[0] : raw);
      if (v) {
        useCsrfTokenStore.getState().setToken(v);
        return;
      }
    }
  }
}

/** If the API includes a CSRF string in JSON (e.g. login or `GET /api/auth/me`), store it for native uploads. */
export function captureCsrfTokenFromJsonBody(data: unknown): void {
  if (!data || typeof data !== 'object') return;
  const o = data as Record<string, unknown>;
  for (const key of JSON_CSRF_KEYS) {
    const v = o[key];
    if (typeof v === 'string' && v.trim()) {
      useCsrfTokenStore.getState().setToken(v.trim());
      return;
    }
  }
  const nested = o.data;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    captureCsrfTokenFromJsonBody(nested);
  }
}

export function requestUrlString(config: { baseURL?: string; url?: string } | undefined): string {
  if (!config) return '';
  const b = (config.baseURL ?? '').replace(/\/$/, '');
  const u = config.url ?? '';
  if (u.startsWith('http')) return u;
  if (!u) return b;
  return `${b}${u.startsWith('/') ? '' : '/'}${u}`;
}

/** Only treat CSRF fields as authoritative on auth routes (avoids accidental capture from unrelated APIs). */
export function isAuthApiUrl(url: string): boolean {
  return /\/api\/auth\//i.test(url);
}

type AxiosLikeSuccess = { config?: { baseURL?: string; url?: string }; data?: unknown; headers?: unknown };

/** Axios success: capture CSRF from response headers (any route), then JSON on `/api/auth/*`. */
export function captureCsrfTokenFromAxiosSuccess(res: AxiosLikeSuccess): void {
  captureCsrfTokenFromResponseHeaders(res.headers);
  if (!isAuthApiUrl(requestUrlString(res.config))) return;
  captureCsrfTokenFromJsonBody(res.data);
}

/**
 * CSRF value for unsafe requests: web reads cookies; native uses the in-memory token from
 * `captureCsrfTokenFromJsonBody` (no native cookie module — works in Expo Go).
 */
export async function getCsrfTokenAsync(): Promise<string | undefined> {
  const memory = useCsrfTokenStore.getState().token?.trim() || undefined;
  if (Platform.OS === 'web') {
    return getCsrfTokenFromWebCookies() ?? memory;
  }
  return memory;
}

/** Headers to merge into `fetch` / Axios for unsafe methods when a CSRF value exists. */
export async function csrfHeaderFields(): Promise<Record<string, string>> {
  const token = await getCsrfTokenAsync();
  if (!token) return {};
  return {
    'x-csrf-token': token,
    'X-XSRF-TOKEN': token,
  };
}
