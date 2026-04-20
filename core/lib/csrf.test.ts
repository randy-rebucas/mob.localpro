import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Platform: { OS: 'web' },
}));

import {
  captureCsrfTokenFromAxiosSuccess,
  captureCsrfTokenFromResponseHeaders,
  isAuthApiUrl,
  requestUrlString,
} from '@/core/lib/csrf';
import { useCsrfTokenStore } from '@/core/stores/csrfTokenStore';

describe('requestUrlString', () => {
  it('joins baseURL and relative url', () => {
    expect(requestUrlString({ baseURL: 'https://api.example.com', url: '/api/auth/me' })).toBe(
      'https://api.example.com/api/auth/me'
    );
  });

  it('handles trailing slash on baseURL', () => {
    expect(requestUrlString({ baseURL: 'https://api.example.com/', url: '/api/auth/me' })).toBe(
      'https://api.example.com/api/auth/me'
    );
  });
});

describe('isAuthApiUrl', () => {
  it('matches /api/auth/ paths', () => {
    expect(isAuthApiUrl('https://api.example.com/api/auth/me')).toBe(true);
    expect(isAuthApiUrl('/api/auth/login')).toBe(true);
  });

  it('rejects non-auth paths', () => {
    expect(isAuthApiUrl('https://api.example.com/api/jobs')).toBe(false);
    expect(isAuthApiUrl('https://api.example.com/api/upload')).toBe(false);
  });
});

describe('captureCsrfTokenFromAxiosSuccess', () => {
  beforeEach(() => {
    useCsrfTokenStore.getState().setToken(null);
  });

  it('does not capture from non-auth URLs', () => {
    captureCsrfTokenFromAxiosSuccess({
      config: { baseURL: 'https://api.example.com', url: '/api/jobs' },
      data: { csrfToken: 'should-not-apply' },
    });
    expect(useCsrfTokenStore.getState().token).toBeNull();
  });

  it('captures from auth URL when csrfToken present', () => {
    captureCsrfTokenFromAxiosSuccess({
      config: { baseURL: 'https://api.example.com', url: '/api/auth/me' },
      data: { csrfToken: 'abc' },
    });
    expect(useCsrfTokenStore.getState().token).toBe('abc');
  });

  it('captures token from response headers on any URL', () => {
    captureCsrfTokenFromResponseHeaders({ 'x-csrf-token': 'from-header' });
    expect(useCsrfTokenStore.getState().token).toBe('from-header');
  });

  it('captures from Axios success headers even when path is not /api/auth/', () => {
    useCsrfTokenStore.getState().setToken(null);
    captureCsrfTokenFromAxiosSuccess({
      config: { baseURL: 'https://api.example.com', url: '/api/jobs' },
      headers: { 'x-csrf-token': 'rotated' },
      data: {},
    });
    expect(useCsrfTokenStore.getState().token).toBe('rotated');
  });
});
