import { API } from '@/core/api/endpoints';
import { api } from '@/core/api/client';
import { coerceNotificationData, type AppNotificationData } from '@/core/notifications/navigateFromNotificationData';

export type AppNotification = {
  id: string;
  /** Display title (API `title` or derived from `type`). */
  title: string;
  body: string;
  at: string;
  read?: boolean;
  /** Raw API `type` e.g. `quote_received`. */
  typeKey?: string;
  data?: AppNotificationData;
};

type UnknownRecord = Record<string, unknown>;

function pickString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function humanizeType(type: string | undefined): string | undefined {
  if (!type) return undefined;
  return type
    .split('_')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function mapNotification(row: UnknownRecord): AppNotification {
  const typeKey = pickString(row.type);
  const titleFromApi = pickString(row.title);
  const message = pickString(row.message) ?? pickString(row.body) ?? '';
  const displayTitle = titleFromApi ?? humanizeType(typeKey) ?? 'Update';
  return {
    id: String(row._id ?? row.id ?? ''),
    title: displayTitle,
    body: message,
    at: String(row.createdAt ?? new Date().toISOString()),
    read: typeof row.read === 'boolean' ? row.read : undefined,
    typeKey: typeKey ?? undefined,
    data: coerceNotificationData(row.data),
  };
}

export type NotificationsListResult = {
  notifications: AppNotification[];
  unreadCount: number;
};

export type NotificationsListParams = {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
};

export const notificationService = {
  async list(params?: NotificationsListParams): Promise<NotificationsListResult> {
    const { data } = await api.get<{ notifications?: UnknownRecord[]; unreadCount?: number; total?: number }>(
      API.notifications.list,
      {
        params: {
          ...(params?.limit != null ? { limit: params.limit } : {}),
          ...(params?.offset != null ? { offset: params.offset } : {}),
          ...(params?.unreadOnly != null ? { unreadOnly: params.unreadOnly } : {}),
        },
      }
    );
    return {
      notifications: (data.notifications ?? []).map(mapNotification),
      unreadCount: typeof data.unreadCount === 'number' && Number.isFinite(data.unreadCount) ? data.unreadCount : 0,
    };
  },

  async markAllRead(): Promise<void> {
    await api.patch(API.notifications.patchBulk);
  },

  async markRead(id: string): Promise<void> {
    await api.patch(API.notifications.read(id));
  },

  /** Registers Expo push token with the API (no-op if the route is missing on older backends). */
  async registerPushToken(expoPushToken: string): Promise<void> {
    await api.post(API.notifications.registerToken, { token: expoPushToken, device: 'expo' });
  },
};
