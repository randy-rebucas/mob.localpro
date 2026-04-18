import { api } from '@/core/api/client';
import type { Job, JobQuote, JobStatus } from '@/core/types/models';

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

export const jobService = {
  async listJobs(): Promise<Job[]> {
    if (useMocks()) {
      return [...MOCK_JOBS];
    }
    const { data } = await api.get<Job[]>('/api/jobs');
    return data;
  },

  async getJob(id: string): Promise<Job | null> {
    if (useMocks()) {
      return MOCK_JOBS.find((j) => j.id === id) ?? null;
    }
    const { data } = await api.get<Job>(`/api/jobs/${id}`);
    return data;
  },

  async createJob(input: {
    title: string;
    description: string;
    budgetMin?: number;
    budgetMax?: number;
    locationLabel?: string;
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
    const { data } = await api.post<Job>('/api/jobs', input);
    return data;
  },

  async listQuotes(jobId: string): Promise<JobQuote[]> {
    if (useMocks()) {
      return MOCK_QUOTES[jobId] ?? [];
    }
    const { data } = await api.get<JobQuote[]>(`/api/jobs/${jobId}/quotes`);
    return data;
  },

  async acceptQuote(jobId: string, quoteId: string): Promise<{ status: JobStatus }> {
    if (useMocks()) {
      return { status: 'in_progress' };
    }
    const { data } = await api.post<{ status: JobStatus }>(`/api/jobs/${jobId}/quotes/${quoteId}/accept`);
    return data;
  },

  async submitReview(jobId: string, rating: number, comment: string): Promise<void> {
    if (useMocks()) {
      return;
    }
    await api.post(`/api/jobs/${jobId}/reviews`, { rating, comment });
  },
};
