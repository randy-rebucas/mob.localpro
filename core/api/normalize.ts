import type { Job, JobQuote, User } from '@/core/types/models';

type UnknownRecord = Record<string, unknown>;

function pickString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function pickNumber(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/** `/api/auth/me` and login `user` payloads use `_id` + `name`. */
export function userFromApi(raw: UnknownRecord): User {
  return {
    id: String(raw._id ?? raw.id ?? ''),
    displayName: String(raw.name ?? raw.displayName ?? ''),
    email: String(raw.email ?? ''),
    role: pickString(raw.role),
  };
}

/** Normalizes a job document from GET/POST `/api/jobs` or list `data[]`. */
export function jobFromApi(raw: UnknownRecord): Job {
  const budget = pickNumber(raw.budget);
  const budgetMin = pickNumber(raw.budgetMin) ?? budget;
  const budgetMax = pickNumber(raw.budgetMax) ?? budget;

  return {
    id: String(raw._id ?? raw.id ?? ''),
    title: String(raw.title ?? ''),
    description: String(raw.description ?? ''),
    status: pickString(raw.status) ?? 'open',
    budgetMin,
    budgetMax,
    createdAt: pickString(raw.createdAt) ?? new Date().toISOString(),
    locationLabel: pickString(raw.location) ?? pickString(raw.locationLabel),
    categoryId: pickString(raw.category) ?? pickString(raw.categoryId),
  };
}

/** Normalizes a quote from GET `/api/jobs/[id]/quotes`. */
export function quoteFromApi(raw: UnknownRecord, jobId: string): JobQuote {
  const other = (raw.otherParty ?? raw.provider) as UnknownRecord | undefined;
  const providerName =
    pickString(raw.providerName) ??
    pickString(other?.name) ??
    pickString((raw.provider as UnknownRecord | undefined)?.name) ??
    'Provider';

  const statusRaw = pickString(raw.status)?.toLowerCase();

  return {
    id: String(raw._id ?? raw.id ?? ''),
    jobId: pickString(raw.jobId) ?? jobId,
    providerName,
    amount: pickNumber(raw.proposedAmount) ?? pickNumber(raw.amount) ?? 0,
    message: pickString(raw.message) ?? pickString(raw.notes) ?? '',
    createdAt: pickString(raw.createdAt) ?? new Date().toISOString(),
    status: statusRaw ?? 'pending',
  };
}
