import { API } from '@/core/api/endpoints';
import { api } from '@/core/api/client';

export type ThreadSummary = {
  id: string;
  title: string;
  lastMessagePreview: string;
  updatedAt: string;
};

type UnknownRecord = Record<string, unknown>;

const MOCK_THREADS: ThreadSummary[] = [
  {
    id: 't-1',
    title: 'Spark Electric Co.',
    lastMessagePreview: 'On my way — ETA 20 mins',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 't-2',
    title: 'CleanPro Manila',
    lastMessagePreview: 'Photos attached after service',
    updatedAt: new Date().toISOString(),
  },
];

function mapThread(row: UnknownRecord): ThreadSummary {
  const last = row.lastMessage as UnknownRecord | undefined;
  return {
    id: String(row.threadId ?? row._id ?? ''),
    title: String(row.jobTitle ?? row.title ?? 'Conversation'),
    lastMessagePreview: last && typeof last.body === 'string' ? last.body : '',
    updatedAt:
      last && typeof last.createdAt === 'string'
        ? last.createdAt
        : typeof row.updatedAt === 'string'
          ? row.updatedAt
          : new Date().toISOString(),
  };
}

export const messageService = {
  async listThreads(): Promise<ThreadSummary[]> {
    if (!__DEV__) {
      const { data } = await api.get<{ threads?: UnknownRecord[] }>(API.messages.threads);
      return (data.threads ?? []).map(mapThread);
    }
    try {
      const { data } = await api.get<{ threads?: UnknownRecord[] }>(API.messages.threads);
      return (data.threads ?? []).map(mapThread);
    } catch {
      return MOCK_THREADS;
    }
  },
};
