import { API } from '@/core/api/endpoints';
import { api } from '@/core/api/client';
import type { ChatMessage } from '@/core/types/models';

type UnknownRecord = Record<string, unknown>;

export type SupportTicketListItem = {
  id: string;
  subject: string;
  status: string;
  category?: string;
  createdAt: string;
};

export type SupportTicketDetail = SupportTicketListItem & {
  body?: string;
  updatedAt?: string;
};

export type CreateSupportTicketInput = {
  subject: string;
  body: string;
  category: 'billing' | 'account' | 'dispute' | 'technical' | 'kyc' | 'payout' | 'other';
  relatedDisputeId?: string;
  relatedJobId?: string;
};

function mapMessage(row: UnknownRecord): ChatMessage {
  const sender = row.sender as UnknownRecord | undefined;
  return {
    id: String(row._id ?? row.id ?? ''),
    body: String(row.body ?? row.message ?? ''),
    createdAt: String(row.createdAt ?? new Date().toISOString()),
    senderLabel:
      typeof sender?.name === 'string'
        ? sender.name
        : typeof row.senderName === 'string'
          ? row.senderName
          : typeof row.senderRole === 'string'
            ? row.senderRole
            : undefined,
  };
}

function mapTicket(row: UnknownRecord): SupportTicketListItem {
  return {
    id: String(row._id ?? row.id ?? ''),
    subject: String(row.subject ?? 'Ticket'),
    status: String(row.status ?? 'open'),
    category: typeof row.category === 'string' ? row.category : undefined,
    createdAt: String(row.createdAt ?? new Date().toISOString()),
  };
}

export const supportService = {
  async listThread(): Promise<ChatMessage[]> {
    const { data } = await api.get<UnknownRecord[] | { messages?: UnknownRecord[] }>(API.support.list);
    if (Array.isArray(data)) {
      return data.map(mapMessage);
    }
    const rows = (data as { messages?: UnknownRecord[] }).messages;
    return (rows ?? []).map(mapMessage);
  },

  async postMessage(body: string): Promise<void> {
    await api.post(API.support.create, { body });
  },

  async listTickets(): Promise<SupportTicketListItem[]> {
    const { data } = await api.get<{ tickets?: UnknownRecord[] }>(API.support.tickets);
    return (data.tickets ?? []).map(mapTicket);
  },

  async getTicket(id: string): Promise<SupportTicketDetail> {
    const { data } = await api.get<UnknownRecord>(API.support.ticketById(id));
    const base = mapTicket(data);
    return {
      ...base,
      body: typeof data.body === 'string' ? data.body : typeof data.description === 'string' ? data.description : undefined,
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : undefined,
    };
  },

  async createTicket(input: CreateSupportTicketInput): Promise<SupportTicketListItem> {
    const { data } = await api.post<UnknownRecord | { ticket?: UnknownRecord }>(API.support.ticketCreate, input);
    const row =
      data && typeof data === 'object' && 'ticket' in data && data.ticket && typeof data.ticket === 'object'
        ? (data.ticket as UnknownRecord)
        : (data as UnknownRecord);
    return mapTicket(row);
  },
};
