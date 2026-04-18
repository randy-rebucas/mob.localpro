import { API } from '@/core/api/endpoints';
import { api } from '@/core/api/client';

export type AnnouncementType = 'info' | 'warning' | 'success' | 'danger';

export type Announcement = {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
};

type UnknownRecord = Record<string, unknown>;

const MOCK: Announcement[] = [
  {
    id: 'mock-1',
    type: 'info',
    title: 'Holiday coverage',
    message: 'Book early for Holy Week — top providers fill up fast.',
  },
  {
    id: 'mock-2',
    type: 'success',
    title: 'Escrow is on',
    message: 'Your payments stay protected until you confirm the job is done.',
  },
];

function mapRow(row: UnknownRecord): Announcement {
  const t = String(row.type ?? 'info');
  const type: AnnouncementType =
    t === 'warning' || t === 'success' || t === 'danger' || t === 'info' ? t : 'info';
  return {
    id: String(row._id ?? row.id ?? ''),
    title: String(row.title ?? ''),
    message: String(row.message ?? row.body ?? ''),
    type,
  };
}

export const announcementService = {
  async list(): Promise<Announcement[]> {
    if (!__DEV__) {
      const { data } = await api.get<{ announcements?: UnknownRecord[] }>(API.announcements.list);
      return (data.announcements ?? []).map(mapRow);
    }
    try {
      const { data } = await api.get<{ announcements?: UnknownRecord[] }>(API.announcements.list);
      const rows = data.announcements ?? [];
      return rows.length ? rows.map(mapRow) : MOCK;
    } catch {
      return MOCK;
    }
  },
};
