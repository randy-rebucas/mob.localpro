import { describe, expect, it } from 'vitest';

import {
  isSafeInternalHref,
  normalizeActionUrlToPath,
  notificationDataToHref,
} from '@/core/notifications/navigateFromNotificationData';

describe('isSafeInternalHref', () => {
  it('allows normal app paths', () => {
    expect(isSafeInternalHref('/jobs/abc')).toBe(true);
    expect(isSafeInternalHref('/wallet')).toBe(true);
    expect(isSafeInternalHref('/discovery?q=1')).toBe(true);
  });

  it('rejects protocol-relative and traversal', () => {
    expect(isSafeInternalHref('//evil.com')).toBe(false);
    expect(isSafeInternalHref('/jobs/../login')).toBe(false);
    expect(isSafeInternalHref('/foo/./bar')).toBe(false);
  });
});

describe('normalizeActionUrlToPath', () => {
  it('strips origin from absolute URLs', () => {
    expect(normalizeActionUrlToPath('https://www.localpro.asia/jobs/1?x=1')).toBe('/jobs/1?x=1');
  });

  it('prefixes relative paths', () => {
    expect(normalizeActionUrlToPath('wallet')).toBe('/wallet');
  });
});

describe('notificationDataToHref', () => {
  it('returns safe action paths', () => {
    expect(notificationDataToHref({ actionUrl: '/messages/thread-1' })).toBe('/messages/thread-1');
  });

  it('ignores unsafe action paths', () => {
    expect(notificationDataToHref({ actionUrl: '/jobs/../login' })).toBe(null);
  });

  it('maps entity types', () => {
    expect(notificationDataToHref({ entityType: 'job', entityId: 'j1' })).toBe('/jobs/j1');
    expect(notificationDataToHref({ entityType: 'thread', entityId: 't1' })).toBe('/messages/t1');
    expect(notificationDataToHref({ entityType: 'wallet', entityId: 'x' })).toBe('/wallet');
  });
});
