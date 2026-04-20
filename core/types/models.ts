export interface Job {
  id: string;
  title: string;
  description: string;
  /** Raw status from API (`open`, `quoted`, `assigned`, `accepted`, `in_progress`, …). */
  status: string;
  budgetMin?: number;
  budgetMax?: number;
  createdAt: string;
  locationLabel?: string;
  categoryId?: string;
}

export type QuoteStatus = 'pending' | 'accepted' | 'rejected' | string;

export interface JobQuote {
  id: string;
  jobId: string;
  providerName: string;
  amount: number;
  message: string;
  createdAt: string;
  status?: QuoteStatus;
}

export interface User {
  id: string;
  displayName: string;
  email: string;
  role?: string;
  /** Profile image URL from `GET /api/auth/me` / avatar upload. */
  avatar?: string | null;
}

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  senderLabel?: string;
};
