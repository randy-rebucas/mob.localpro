import { Platform } from 'react-native';

import { API } from '@/core/api/endpoints';
import { refreshSessionRequest } from '@/core/api/sessionRefresh';
import { API_BASE_URL } from '@/core/constants/env';
import { captureCsrfTokenFromJsonBody, captureCsrfTokenFromResponseHeaders, csrfHeaderFields } from '@/core/lib/csrf';
import { extractPublicUrlFromUploadResponse, pickErrorMessage } from '@/core/services/uploadResponseParse';
import { useSessionStore } from '@/core/stores/sessionStore';

export { extractPublicUrlFromUploadResponse } from '@/core/services/uploadResponseParse';

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
 * On **401**, refreshes the session once (same as axios flow) and retries the same method.
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
    const csrf = await csrfHeaderFields();
    return fetch(url, {
      method,
      body: form,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...csrf,
      },
    });
  }

  async function requestWithRefreshOn401(method: 'POST' | 'PUT'): Promise<Response> {
    let attempt = await requestUpload(method);
    if (attempt.status !== 401) {
      return attempt;
    }
    const user = await refreshSessionRequest();
    if (user) {
      useSessionStore.getState().setUser(user);
    }
    attempt = await requestUpload(method);
    return attempt;
  }

  let res = await requestWithRefreshOn401('POST');
  if (res.status === 405) {
    res = await requestWithRefreshOn401('PUT');
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
    captureCsrfTokenFromResponseHeaders(res.headers);
    throw new Error(pickErrorMessage(data, res.status));
  }

  captureCsrfTokenFromResponseHeaders(res.headers);
  captureCsrfTokenFromJsonBody(data);

  const publicUrl = extractPublicUrlFromUploadResponse(data);
  if (!publicUrl) {
    const hint =
      data && typeof data === 'object' ? ` Keys: ${Object.keys(data as object).join(', ')}` : '';
    throw new Error(`Upload succeeded but no file URL was returned.${hint}`);
  }
  return publicUrl;
}
