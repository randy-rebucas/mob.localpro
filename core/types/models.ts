export type JobStatus = 'open' | 'quoted' | 'in_progress' | 'completed' | 'cancelled';

export interface Job {
  id: string;
  title: string;
  description: string;
  status: JobStatus;
  budgetMin?: number;
  budgetMax?: number;
  createdAt: string;
  locationLabel?: string;
}

export interface JobQuote {
  id: string;
  jobId: string;
  providerName: string;
  amount: number;
  message: string;
  createdAt: string;
}

export interface User {
  id: string;
  displayName: string;
  email: string;
}
