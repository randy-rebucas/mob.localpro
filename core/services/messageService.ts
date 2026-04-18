import { API } from '@/core/api/endpoints';
import { api } from '@/core/api/client';
import type { ChatMessage } from '@/core/types/models';

export type ThreadSummary = {
  id: string;
  title: string;
  lastMessagePreview: string;
  updatedAt: string;
  unreadCount: number;
  otherPartyName?: string;
};

type UnknownRecord = Record<string, unknown>;

function pickString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function mapThread(row: UnknownRecord): ThreadSummary {
  const last = row.lastMessage as UnknownRecord | undefined;
  const other = row.otherParty as UnknownRecord | undefined;
  const unread = row.unreadCount;
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
    unreadCount: typeof unread === 'number' && Number.isFinite(unread) ? unread : 0,
    otherPartyName: pickString(other?.name),
  };
}

function mapMessage(row: UnknownRecord): ChatMessage {
  const sender = row.sender as UnknownRecord | undefined;
  return {
    id: String(row._id ?? row.id ?? ''),
    body: String(row.body ?? ''),
    createdAt: String(row.createdAt ?? new Date().toISOString()),
    senderLabel:
      typeof sender?.name === 'string'
        ? sender.name
        : typeof row.senderName === 'string'
          ? row.senderName
          : pickString(row.senderRole),
  };
}

export const messageService = {
  async getUnreadCount(): Promise<number> {
    const { data } = await api.get<{ unreadCount?: number }>(API.messages.list);
    return typeof data.unreadCount === 'number' && Number.isFinite(data.unreadCount) ? data.unreadCount : 0;
  },

  async listThreads(): Promise<ThreadSummary[]> {
    const { data } = await api.get<{ threads?: UnknownRecord[] }>(API.messages.threads);
    const rows = (data.threads ?? []).map(mapThread);
    rows.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return rows;
  },

  /** `threadId` for job threads equals `jobId` (see API reference). */
  async getMessages(threadId: string): Promise<ChatMessage[]> {
    const { data } = await api.get<UnknownRecord[]>(API.messages.thread(threadId));
    if (!Array.isArray(data)) {
      return [];
    }
    return data.map(mapMessage);
  },

  async postMessage(threadId: string, body: string): Promise<void> {
    await api.post(API.messages.threadPost(threadId), { body });
  },
};
