import { API } from '@/core/api/endpoints';
import { api } from '@/core/api/client';

type UnknownRecord = Record<string, unknown>;

export type RecurringFrequency = 'weekly' | 'monthly';

export type RecurringScheduleListItem = {
  id: string;
  title: string;
  status: string;
  frequency: string;
  scheduleDate?: string;
  budget?: number;
  location?: string;
  providerId?: string;
  maxRuns?: number;
  autoPayEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type RecurringScheduleDetail = RecurringScheduleListItem & {
  description: string;
  category?: string;
  specialInstructions?: string;
};

export type PastProviderRow = {
  id: string;
  displayName: string;
  subtitle?: string;
};

export type SavedPaymentMethod = {
  last4?: string;
  brand?: string;
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

function pickBool(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  return undefined;
}

function mapScheduleRow(row: UnknownRecord): RecurringScheduleListItem {
  return {
    id: String(row._id ?? row.id ?? ''),
    title: pickString(row.title) ?? 'Recurring schedule',
    status: pickString(row.status) ?? 'active',
    frequency: pickString(row.frequency) ?? 'monthly',
    scheduleDate: pickString(row.scheduleDate) ?? pickString(row.nextRunDate),
    budget: pickNumber(row.budget),
    location: pickString(row.location),
    providerId: pickString(row.providerId),
    maxRuns: pickNumber(row.maxRuns),
    autoPayEnabled: pickBool(row.autoPayEnabled),
    createdAt: pickString(row.createdAt),
    updatedAt: pickString(row.updatedAt),
  };
}

function unwrapSchedulePayload(data: UnknownRecord): UnknownRecord {
  const nested =
    (data.schedule as UnknownRecord | undefined) ??
    (data.recurring as UnknownRecord | undefined) ??
    (data.data as UnknownRecord | undefined);
  return nested && typeof nested === 'object' ? nested : data;
}

function toDetail(row: UnknownRecord): RecurringScheduleDetail {
  const base = mapScheduleRow(row);
  return {
    ...base,
    description: pickString(row.description) ?? '',
    category: pickString(row.category) ?? pickString(row.categoryId),
    specialInstructions: pickString(row.specialInstructions),
  };
}

function extractScheduleArray(data: unknown): UnknownRecord[] {
  if (Array.isArray(data)) return data as UnknownRecord[];
  if (data && typeof data === 'object') {
    const o = data as UnknownRecord;
    const arr = o.data ?? o.schedules ?? o.items ?? o.results;
    if (Array.isArray(arr)) return arr as UnknownRecord[];
  }
  return [];
}

export type CreateRecurringScheduleInput = {
  title: string;
  category: string;
  description: string;
  budget?: number;
  location?: string;
  frequency: RecurringFrequency;
  scheduleDate: string;
  autoPayEnabled?: boolean;
  specialInstructions?: string;
  maxRuns?: number;
  providerId?: string;
};

export type UpdateRecurringScheduleInput = {
  title?: string;
  description?: string;
  budget?: number;
  location?: string;
  maxRuns?: number;
  autoPayEnabled?: boolean;
  providerId?: string;
};

export const recurringService = {
  async list(): Promise<RecurringScheduleListItem[]> {
    const { data } = await api.get<unknown>(API.recurring.list);
    return extractScheduleArray(data)
      .map(mapScheduleRow)
      .filter((r) => r.id.length > 0);
  },

  async getById(id: string): Promise<RecurringScheduleDetail> {
    const { data } = await api.get<UnknownRecord>(API.recurring.byId(id));
    const row = unwrapSchedulePayload(data);
    return toDetail(row);
  },

  async create(input: CreateRecurringScheduleInput): Promise<RecurringScheduleListItem> {
    const { data } = await api.post<UnknownRecord>(API.recurring.create, input);
    const row = unwrapSchedulePayload(data);
    const item = mapScheduleRow(row);
    if (!item.id) throw new Error('Create recurring response missing id');
    return item;
  },

  async update(id: string, input: UpdateRecurringScheduleInput): Promise<RecurringScheduleDetail> {
    const { data } = await api.put<UnknownRecord>(API.recurring.byId(id), input);
    const row = unwrapSchedulePayload(data);
    return toDetail(row);
  },

  async control(id: string, action: 'pause' | 'resume' | 'cancel'): Promise<RecurringScheduleDetail> {
    const { data } = await api.patch<UnknownRecord>(API.recurring.byId(id), { action });
    const row = unwrapSchedulePayload(data);
    return toDetail(row);
  },

  async listPastProviders(): Promise<PastProviderRow[]> {
    const { data } = await api.get<unknown>(API.recurring.pastProviders);
    if (!data || typeof data !== 'object') return [];
    const o = data as UnknownRecord;
    const rows = Array.isArray(o.providers)
      ? (o.providers as UnknownRecord[])
      : Array.isArray(o.data)
        ? (o.data as UnknownRecord[])
        : extractScheduleArray(data);
    return rows.map((row) => ({
      id: String(row._id ?? row.id ?? row.userId ?? row.providerId ?? ''),
      displayName:
        pickString(row.name) ??
        pickString(row.displayName) ??
        pickString(row.businessName) ??
        'Provider',
      subtitle: pickString(row.headline) ?? pickString(row.category),
    })).filter((r) => r.id.length > 0);
  },

  async getSavedMethod(): Promise<SavedPaymentMethod | null> {
    const { data } = await api.get<UnknownRecord>(API.recurring.savedMethod);
    const raw = (data.savedMethod as UnknownRecord | undefined) ?? (data.method as UnknownRecord | undefined);
    if (!raw || typeof raw !== 'object') return null;
    return {
      last4: pickString(raw.last4),
      brand: pickString(raw.brand),
    };
  },

  async deleteSavedMethod(): Promise<void> {
    await api.delete(API.recurring.savedMethod);
  },
};
