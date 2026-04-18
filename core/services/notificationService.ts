import { API } from '@/core/api/endpoints';
import { api } from '@/core/api/client';

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  at: string;
  read?: boolean;
};

type UnknownRecord = Record<string, unknown>;

function mapNotification(row: UnknownRecord): AppNotification {
  return {
    id: String(row._id ?? row.id ?? ''),
    title: String(row.type ?? 'Update'),
    body: String(row.message ?? row.body ?? ''),
    at: String(row.createdAt ?? new Date().toISOString()),
    read: typeof row.read === 'boolean' ? row.read : undefined,
  };
}

export const notificationService = {
  async list(): Promise<AppNotification[]> {
    const { data } = await api.get<{ notifications?: UnknownRecord[] }>(API.notifications.list);
    return (data.notifications ?? []).map(mapNotification);
  },

  async markAllRead(): Promise<void> {
    await api.patch(API.notifications.patchBulk);
  },
};
