import { describe, expect, it } from 'vitest';

import { extractPublicUrlFromUploadResponse } from '@/core/services/uploadResponseParse';

describe('extractPublicUrlFromUploadResponse', () => {
  it('reads top-level url', () => {
    expect(extractPublicUrlFromUploadResponse({ url: 'https://cdn.example.com/a.jpg' })).toBe(
      'https://cdn.example.com/a.jpg'
    );
  });

  it('reads nested data.fileUrl', () => {
    expect(
      extractPublicUrlFromUploadResponse({ data: { fileUrl: 'https://x.com/b.png' } })
    ).toBe('https://x.com/b.png');
  });

  it('reads files[0].url and prefixes relative paths', () => {
    const u = extractPublicUrlFromUploadResponse({ files: [{ url: '/uploads/c.webp' }] });
    expect(u).toContain('/uploads/c.webp');
    expect(u?.startsWith('http')).toBe(true);
  });

  it('returns null for empty object', () => {
    expect(extractPublicUrlFromUploadResponse({})).toBe(null);
  });
});
