import axios from 'axios';

import { API } from '@/core/api/endpoints';
import { jobFromApi, quoteFromApi } from '@/core/api/normalize';
import { api } from '@/core/api/client';
import type { Job, JobQuote } from '@/core/types/models';

type UnknownRecord = Record<string, unknown>;

function pickString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

export type ListJobsParams = {
  status?: string;
  category?: string;
  page?: number;
  limit?: number;
  aiRank?: boolean;
};

export type ListJobsResult = {
  jobs: Job[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type CreateJobInput = {
  title: string;
  description: string;
  categoryId: string;
  budget?: number;
  location?: string;
  coordinates?: { lat: number; lng: number };
  tags?: string[];
};

export type FundJobResult =
  | { kind: 'checkout'; checkoutUrl: string; checkoutSessionId?: string }
  | { kind: 'simulated'; message?: string };

function extractJobRows(data: UnknownRecord | UnknownRecord[]): UnknownRecord[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data.data)) {
    return data.data as UnknownRecord[];
  }
  return [];
}

export const jobService = {
  async listJobs(params?: ListJobsParams): Promise<ListJobsResult> {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 10;
    const { data } = await api.get<UnknownRecord>(API.jobs.list, {
      params: {
        page,
        limit,
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.category ? { category: params.category } : {}),
        ...(params?.aiRank != null ? { aiRank: params.aiRank } : {}),
      },
    });
    const rows = extractJobRows(data);
    const total = typeof data.total === 'number' ? data.total : rows.length;
    const pageUsed = typeof data.page === 'number' ? data.page : page;
    const limitUsed = typeof data.limit === 'number' ? data.limit : limit;
    const totalPages = Math.max(
      1,
      typeof data.totalPages === 'number' ? data.totalPages : Math.ceil(total / Math.max(1, limitUsed))
    );
    return {
      jobs: rows.map((row) => jobFromApi(row)),
      page: pageUsed,
      limit: limitUsed,
      total,
      totalPages,
    };
  },

  async getJob(id: string): Promise<Job | null> {
    try {
      const { data } = await api.get<UnknownRecord>(API.jobs.byId(id));
      return jobFromApi(data);
    } catch (e) {
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        return null;
      }
      throw e;
    }
  },

  async createJob(input: CreateJobInput): Promise<Job> {
    const body: UnknownRecord = {
      title: input.title,
      description: input.description,
      category: input.categoryId,
    };
    if (input.budget != null) {
      body.budget = input.budget;
    }
    if (input.location) {
      body.location = input.location;
    }
    if (input.coordinates) {
      body.coordinates = input.coordinates;
    }
    if (input.tags?.length) {
      body.tags = input.tags;
    }
    const { data } = await api.post<UnknownRecord>(API.jobs.create, body);
    return jobFromApi(data);
  },

  async updateJob(id: string, patch: Partial<CreateJobInput> & Record<string, unknown>): Promise<Job> {
    const { data } = await api.put<UnknownRecord>(API.jobs.byId(id), patch);
    return jobFromApi(data);
  },

  async deleteJob(id: string): Promise<void> {
    await api.delete(API.jobs.byId(id));
  },

  async cancelJob(id: string, reason: string): Promise<Job> {
    const { data } = await api.post<UnknownRecord>(API.jobs.cancel(id), { reason });
    if (data.job && typeof data.job === 'object') {
      return jobFromApi(data.job as UnknownRecord);
    }
    const fresh = await api.get<UnknownRecord>(API.jobs.byId(id));
    return jobFromApi(fresh.data);
  },

  async fundEscrow(jobId: string): Promise<FundJobResult> {
    const { data } = await api.patch<UnknownRecord>(API.jobs.fund(jobId));
    if (data.simulated === true) {
      return { kind: 'simulated', message: pickString(data.message) };
    }
    const url = pickString(data.checkoutUrl);
    if (url) {
      return {
        kind: 'checkout',
        checkoutUrl: url,
        checkoutSessionId: pickString(data.checkoutSessionId),
      };
    }
    return { kind: 'simulated', message: 'Escrow update completed' };
  },

  async fundEscrowFromWallet(jobId: string, amount?: number): Promise<Job> {
    const { data } = await api.post<UnknownRecord>(API.jobs.fundWallet(jobId), {
      ...(amount != null ? { amount } : {}),
    });
    if (data.job && typeof data.job === 'object') {
      return jobFromApi(data.job as UnknownRecord);
    }
    const fresh = await api.get<UnknownRecord>(API.jobs.byId(jobId));
    return jobFromApi(fresh.data);
  },

  async listQuotes(jobId: string): Promise<JobQuote[]> {
    const { data } = await api.get<UnknownRecord[] | UnknownRecord>(API.jobs.quotes(jobId));
    const rows = Array.isArray(data) ? data : Array.isArray(data.quotes) ? (data.quotes as UnknownRecord[]) : [];
    return rows.map((row) => quoteFromApi(row, jobId));
  },

  async acceptQuote(_jobId: string, quoteId: string): Promise<{ status: string }> {
    const { data } = await api.post<UnknownRecord>(API.quotes.accept(quoteId));
    const jobPayload = (data.job ?? data) as UnknownRecord;
    if (jobPayload && typeof jobPayload === 'object' && 'status' in jobPayload) {
      return { status: String(jobPayload.status) };
    }
    return { status: 'accepted' };
  },

  async rejectQuote(quoteId: string): Promise<void> {
    await api.patch(API.quotes.reject(quoteId));
  },

  async submitReview(jobId: string, rating: number, feedback: string, breakdown?: Record<string, number>): Promise<void> {
    const body: UnknownRecord = { jobId, rating, feedback };
    if (breakdown) {
      body.breakdown = breakdown;
    }
    await api.post(API.reviews.create, body);
  },
};
