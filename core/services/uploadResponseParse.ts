import { API_BASE_URL } from '@/core/constants/env';

type UnknownRecord = Record<string, unknown>;

function normalizeAssetUrl(u: string): string {
  const trimmed = u.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) {
    const base = API_BASE_URL.replace(/\/$/, '');
    return `${base}${trimmed}`;
  }
  return trimmed;
}

/** Parse JSON from `POST /api/upload` (and similar) into a public file URL. */
export function extractPublicUrlFromUploadResponse(data: unknown): string | null {
  if (typeof data === 'string' && data.trim()) {
    return normalizeAssetUrl(data);
  }
  if (!data || typeof data !== 'object') return null;
  const o = data as UnknownRecord;
  for (const k of [
    'url',
    'fileUrl',
    'avatar',
    'avatarUrl',
    'imageUrl',
    'mediaUrl',
    'location',
    'secure_url',
    'publicUrl',
    'href',
    'src',
    'path',
  ] as const) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) {
      return normalizeAssetUrl(v);
    }
  }
  const files = o.files;
  if (Array.isArray(files) && files[0] && typeof files[0] === 'object') {
    const u = (files[0] as UnknownRecord).url;
    if (typeof u === 'string' && u.trim()) {
      return normalizeAssetUrl(u);
    }
  }
  const file = o.file;
  if (file && typeof file === 'object') {
    const u = (file as UnknownRecord).url;
    if (typeof u === 'string' && u.trim()) {
      return normalizeAssetUrl(u);
    }
  }
  if ('data' in o) {
    return extractPublicUrlFromUploadResponse(o.data);
  }
  const result = o.result;
  if (result && typeof result === 'object') {
    return extractPublicUrlFromUploadResponse(result);
  }
  return null;
}

function pickErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === 'object') {
    const o = data as UnknownRecord;
    const m = o.message ?? o.error;
    if (typeof m === 'string' && m.trim()) return m.trim();
  }
  return `Upload failed (${status})`;
}

export { pickErrorMessage };
