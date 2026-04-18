import { API } from '@/core/api/endpoints';
import { api } from '@/core/api/client';

type UnknownRecord = Record<string, unknown>;

export type ConsultationType = 'site_inspection' | 'chat';

export type ConsultationListItem = {
  id: string;
  title: string;
  status: string;
  type: string;
  targetUserId?: string;
  clientId?: string;
  providerId?: string;
  createdAt: string;
  updatedAt?: string;
};

export type ConsultationMessage = {
  id: string;
  body: string;
  createdAt: string;
  senderLabel?: string;
};

export type ConsultationDetail = ConsultationListItem & {
  description: string;
  location?: string;
  messages: ConsultationMessage[];
  estimateAmount?: number;
  estimateNote?: string;
};

export type ListConsultationsResult = {
  items: ConsultationListItem[];
  total: number;
  page: number;
  limit: number;
};

export type CreateConsultationInput = {
  targetUserId: string;
  type: ConsultationType;
  title: string;
  description: string;
  location?: string;
  coordinates?: { type: 'Point'; coordinates: [number, number] };
  photos?: string[];
};

function pickString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function pickNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function mapConsultationRow(row: UnknownRecord): ConsultationListItem {
  return {
    id: String(row._id ?? row.id ?? ''),
    title: pickString(row.title) ?? 'Consultation',
    status: pickString(row.status) ?? 'pending',
    type: pickString(row.type) ?? 'chat',
    targetUserId: pickString(row.targetUserId),
    clientId: pickString(row.clientId ?? row.clientUserId ?? row.requesterId),
    providerId: pickString(row.providerId ?? row.providerUserId ?? row.targetUserId),
    createdAt: pickString(row.createdAt) ?? new Date().toISOString(),
    updatedAt: pickString(row.updatedAt),
  };
}

function mapMessage(row: UnknownRecord): ConsultationMessage {
  const sender = row.sender as UnknownRecord | undefined;
  return {
    id: String(row._id ?? row.id ?? ''),
    body: pickString(row.body) ?? pickString(row.message) ?? '',
    createdAt: pickString(row.createdAt) ?? new Date().toISOString(),
    senderLabel:
      pickString(sender?.name) ??
      pickString(row.senderName) ??
      pickString(row.senderRole) ??
      pickString(row.authorName),
  };
}

function unwrapConsultationPayload(data: UnknownRecord): UnknownRecord {
  const nested =
    (data.consultation as UnknownRecord | undefined) ??
    (data.data as UnknownRecord | undefined) ??
    (data.consultationRequest as UnknownRecord | undefined);
  return nested && typeof nested === 'object' ? nested : data;
}

function toDetail(row: UnknownRecord): ConsultationDetail {
  const base = mapConsultationRow(row);
  const msgsRaw = row.messages ?? row.thread ?? row.comments;
  const messages = Array.isArray(msgsRaw) ? (msgsRaw as UnknownRecord[]).map(mapMessage) : [];
  return {
    ...base,
    description: pickString(row.description) ?? '',
    location: pickString(row.location),
    messages,
    estimateAmount: pickNumber(row.estimateAmount),
    estimateNote: pickString(row.estimateNote),
  };
}

export const consultationService = {
  async list(params?: { status?: string; page?: number; limit?: number }): Promise<ListConsultationsResult> {
    const { data } = await api.get<unknown>(API.consultations.list, {
      params: {
        ...(params?.status ? { status: params.status } : {}),
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
      },
    });

    if (Array.isArray(data)) {
      return {
        items: (data as UnknownRecord[]).map(mapConsultationRow).filter((r) => r.id.length > 0),
        total: data.length,
        page: 1,
        limit: data.length,
      };
    }

    if (data && typeof data === 'object') {
      const o = data as UnknownRecord;
      const arr = (o.data ?? o.consultations ?? o.items ?? o.results) as unknown;
      if (Array.isArray(arr)) {
        const rows = arr as UnknownRecord[];
        return {
          items: rows.map(mapConsultationRow).filter((r) => r.id.length > 0),
          total: pickNumber(o.total) ?? rows.length,
          page: pickNumber(o.page) ?? 1,
          limit: pickNumber(o.limit) ?? rows.length,
        };
      }
    }

    return { items: [], total: 0, page: 1, limit: 20 };
  },

  async getById(id: string): Promise<ConsultationDetail> {
    const { data } = await api.get<UnknownRecord>(API.consultations.byId(id));
    const row = unwrapConsultationPayload(data);
    return toDetail(row);
  },

  async create(input: CreateConsultationInput): Promise<ConsultationListItem> {
    const { data } = await api.post<UnknownRecord>(API.consultations.create, input);
    const row = unwrapConsultationPayload(data);
    const item = mapConsultationRow(row);
    if (!item.id) {
      throw new Error('Create consultation response missing id');
    }
    return item;
  },

  async respond(
    id: string,
    body: { action: 'accept' | 'decline'; estimateAmount?: number; estimateNote?: string }
  ): Promise<ConsultationDetail> {
    const { data } = await api.put<UnknownRecord>(API.consultations.respond(id), body);
    const row = unwrapConsultationPayload(data);
    return toDetail(row);
  },

  async postMessage(id: string, body: string): Promise<void> {
    await api.post(API.consultations.messages(id), { body });
  },

  async convertToJob(
    id: string,
    body: {
      title?: string;
      description?: string;
      budget?: number;
      scheduleDate?: string;
      specialInstructions?: string;
    }
  ): Promise<string> {
    const { data } = await api.post<UnknownRecord>(API.consultations.convertToJob(id), body);
    const o = data && typeof data === 'object' ? (data as UnknownRecord) : {};
    const job = (o.job ?? o) as UnknownRecord;
    const jobId = String(job._id ?? job.id ?? '');
    if (!jobId) throw new Error('Convert response missing job id');
    return jobId;
  },
};
