import { Platform } from 'react-native';

import { API } from '@/core/api/endpoints';
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

function extractUploadedUrl(data: unknown): string | null {
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
    return extractUploadedUrl(o.data);
  }
  const result = o.result;
  if (result && typeof result === 'object') {
    return extractUploadedUrl(result);
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

async function appendFileToFormData(form: FormData, uri: string, name: string, mimeType: string): Promise<void> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    form.append('file', blob, name);
    return;
  }
  form.append('file', { uri, name, type: mimeType } as unknown as Blob);
}

/**
 * Uploads a local image to `POST /api/upload` (multipart field `file`).
 * Uses `fetch` instead of Axios so FormData is not JSON-stringified (Axios does that when
 * the default `Content-Type: application/json` is still set for some RN/merge cases).
 * Cookies are sent with `credentials: 'include'` to match `api` session behavior.
 */
export async function uploadPublicImage(localUri: string, opts?: { fileName?: string; mimeType?: string }): Promise<string> {
  const mimeType = opts?.mimeType?.trim() || 'image/jpeg';
  const extFromMime = mimeType.includes('png')
    ? 'png'
    : mimeType.includes('webp')
      ? 'webp'
      : mimeType.includes('heic') || mimeType.includes('heif')
        ? 'jpg'
        : 'jpg';
  const name = opts?.fileName?.trim() || `avatar.${extFromMime}`;

  const base = API_BASE_URL.replace(/\/$/, '');
  const path = API.upload.post.startsWith('/') ? API.upload.post : `/${API.upload.post}`;
  const url = `${base}${path}`;

  async function requestUpload(method: 'POST' | 'PUT'): Promise<Response> {
    const form = new FormData();
    await appendFileToFormData(form, localUri, name, mimeType);
    return fetch(url, {
      method,
      body: form,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });
  }

  let res = await requestUpload('POST');
  if (res.status === 405) {
    res = await requestUpload('PUT');
  }

  const text = await res.text();
  let data: unknown = {};
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      throw new Error(`Upload failed (${res.status}): response was not JSON`);
    }
  }

  if (!res.ok) {
    throw new Error(pickErrorMessage(data, res.status));
  }

  const publicUrl = extractUploadedUrl(data);
  if (!publicUrl) {
    const hint =
      data && typeof data === 'object' ? ` Keys: ${Object.keys(data as object).join(', ')}` : '';
    throw new Error(`Upload succeeded but no file URL was returned.${hint}`);
  }
  return publicUrl;
}
