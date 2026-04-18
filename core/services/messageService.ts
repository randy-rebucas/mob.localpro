import { api } from '@/core/api/client';

export type ThreadSummary = {
  id: string;
  title: string;
  lastMessagePreview: string;
  updatedAt: string;
};

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

export const messageService = {
  async listThreads(): Promise<ThreadSummary[]> {
    if (__DEV__) {
      return MOCK_THREADS;
    }
    const { data } = await api.get<ThreadSummary[]>('/api/messages/threads');
    return data;
  },
};
