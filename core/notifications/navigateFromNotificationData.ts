import type { Href } from 'expo-router';

export type AppNotificationData = {
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
};

function pickString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

/** Reject open redirects and path traversal from push `actionUrl` payloads. */
export function isSafeInternalHref(path: string): boolean {
  const pathOnly = path.split('?')[0] ?? '';
  if (!pathOnly.startsWith('/') || pathOnly.startsWith('//')) {
    return false;
  }
  for (const seg of pathOnly.split('/')) {
    if (seg === '..' || seg === '.') {
      return false;
    }
  }
  return true;
}

/** Normalize web or absolute URLs to an in-app path (`/…`). */
export function normalizeActionUrlToPath(actionUrl: string): string {
  const raw = actionUrl.trim();
  try {
    if (/^https?:\/\//i.test(raw)) {
      const u = new URL(raw);
      return u.pathname + u.search || '/';
    }
  } catch {
    /* keep raw */
  }
  return raw.startsWith('/') ? raw : `/${raw}`;
}

/**
 * Returns an Expo Router `href` for in-app navigation, or `null` if unknown.
 */
export function notificationDataToHref(data: AppNotificationData | undefined): Href | null {
  if (!data) return null;

  const action = pickString(data.actionUrl);
  if (action) {
    const path = normalizeActionUrlToPath(action);
    if (path.startsWith('/') && isSafeInternalHref(path)) {
      return path as Href;
    }
  }

  const entityType = pickString(data.entityType)?.toLowerCase();
  const entityId = pickString(data.entityId);
  if (!entityId) return null;

  if (entityType === 'job' || entityType === 'jobs') {
    return `/jobs/${encodeURIComponent(entityId)}` as Href;
  }
  if (entityType === 'message' || entityType === 'thread' || entityType === 'messages') {
    return `/messages/${encodeURIComponent(entityId)}` as Href;
  }
  if (entityType === 'wallet' || entityType === 'payment' || entityType === 'payments') {
    return '/wallet' as Href;
  }

  return null;
}

export function coerceNotificationData(raw: unknown): AppNotificationData | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'string') {
    try {
      return coerceNotificationData(JSON.parse(raw) as unknown);
    } catch {
      return undefined;
    }
  }
  if (typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const metadata =
    o.metadata && typeof o.metadata === 'object' && !Array.isArray(o.metadata)
      ? (o.metadata as Record<string, unknown>)
      : undefined;
  return {
    entityType: pickString(o.entityType),
    entityId: pickString(o.entityId),
    actionUrl: pickString(o.actionUrl),
    metadata,
  };
}

/** Push payloads sometimes stringify `data`. */
export function parsePushNotificationData(raw: Record<string, unknown>): AppNotificationData | undefined {
  const nested = raw.data;
  if (typeof nested === 'string') {
    try {
      const parsed = JSON.parse(nested) as unknown;
      return coerceNotificationData(parsed);
    } catch {
      return undefined;
    }
  }
  if (nested && typeof nested === 'object') {
    return coerceNotificationData(nested);
  }
  return coerceNotificationData(raw);
}
