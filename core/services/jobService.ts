import { API } from '@/core/api/endpoints';
import { jobFromApi, quoteFromApi } from '@/core/api/normalize';
import { api } from '@/core/api/client';
import type { Job, JobQuote, JobStatus } from '@/core/types/models';

type UnknownRecord = Record<string, unknown>;

const MOCK_JOBS: Job[] = [
  {
    id: 'job-1',
    title: 'Deep clean 2BR condo — BGC',
    description: 'Kitchen grease, bathrooms, windows inside only.',
    status: 'open',
    budgetMin: 2500,
    budgetMax: 4000,
    createdAt: new Date().toISOString(),
    locationLabel: 'Taguig',
  },
  {
    id: 'job-2',
    title: 'Install 3 ceiling fans',
    description: 'Materials on-site. Need licensed electrician.',
    status: 'quoted',
    budgetMin: 1500,
    budgetMax: 2500,
    createdAt: new Date().toISOString(),
    locationLabel: 'Quezon City',
  },
];

const MOCK_QUOTES: Record<string, JobQuote[]> = {
  'job-1': [
    {
      id: 'q-demo',
      jobId: 'job-1',
      providerName: 'CleanPro Manila',
      amount: 3200,
      message: 'Eco supplies included. Weekend slots available.',
      createdAt: new Date().toISOString(),
    },
  ],
  'job-2': [
    {
      id: 'q-1',
      jobId: 'job-2',
      providerName: 'Spark Electric Co.',
      amount: 2200,
      message: 'Can start Saturday AM.',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'q-2',
      jobId: 'job-2',
      providerName: 'Handy Juan',
      amount: 1800,
      message: 'Weekday evenings only.',
      createdAt: new Date().toISOString(),
    },
  ],
};

function useMocks(): boolean {
  return __DEV__;
}

function pickStatus(raw: unknown): JobStatus {
  const s = typeof raw === 'string' ? raw : '';
  const allowed: JobStatus[] = ['open', 'quoted', 'in_progress', 'completed', 'cancelled'];
  return (allowed.includes(s as JobStatus) ? s : 'open') as JobStatus;
}

export const jobService = {
  async listJobs(): Promise<Job[]> {
    if (useMocks()) {
      return [...MOCK_JOBS];
    }
    const { data } = await api.get<UnknownRecord | UnknownRecord[]>(API.jobs.list);
    const rows = Array.isArray(data) ? data : Array.isArray(data.data) ? (data.data as UnknownRecord[]) : [];
    return rows.map((row) => jobFromApi(row));
  },

  async getJob(id: string): Promise<Job | null> {
    if (useMocks()) {
      return MOCK_JOBS.find((j) => j.id === id) ?? null;
    }
    const { data } = await api.get<UnknownRecord>(API.jobs.byId(id));
    return jobFromApi(data);
  },

  async createJob(input: {
    title: string;
    description: string;
    budgetMin?: number;
    budgetMax?: number;
    locationLabel?: string;
    categoryId?: string;
  }): Promise<Job> {
    if (useMocks()) {
      const job: Job = {
        id: `job-${Date.now()}`,
        title: input.title,
        description: input.description,
        status: 'open',
        budgetMin: input.budgetMin,
        budgetMax: input.budgetMax,
        locationLabel: input.locationLabel,
        createdAt: new Date().toISOString(),
      };
      MOCK_JOBS.unshift(job);
      return job;
    }
    const budget = input.budgetMax ?? input.budgetMin;
    const { data } = await api.post<UnknownRecord>(API.jobs.create, {
      title: input.title,
      description: input.description,
      category: input.categoryId ?? 'general',
      ...(budget != null ? { budget } : {}),
      ...(input.locationLabel ? { location: input.locationLabel } : {}),
    });
    return jobFromApi(data);
  },

  async listQuotes(jobId: string): Promise<JobQuote[]> {
    if (useMocks()) {
      return MOCK_QUOTES[jobId] ?? [];
    }
    const { data } = await api.get<UnknownRecord[] | UnknownRecord>(API.jobs.quotes(jobId));
    const rows = Array.isArray(data) ? data : Array.isArray(data.quotes) ? (data.quotes as UnknownRecord[]) : [];
    return rows.map((row) => quoteFromApi(row, jobId));
  },

  async acceptQuote(_jobId: string, quoteId: string): Promise<{ status: JobStatus }> {
    if (useMocks()) {
      return { status: 'in_progress' };
    }
    const { data } = await api.post<UnknownRecord>(API.quotes.accept(quoteId));
    const jobPayload = (data.job ?? data) as UnknownRecord;
    if (jobPayload && typeof jobPayload === 'object' && 'status' in jobPayload) {
      return { status: pickStatus(jobPayload.status) };
    }
    return { status: 'in_progress' };
  },

  async submitReview(jobId: string, rating: number, comment: string): Promise<void> {
    if (useMocks()) {
      return;
    }
    await api.post(API.reviews.create, {
      jobId,
      rating,
      feedback: comment,
    });
  },
};
