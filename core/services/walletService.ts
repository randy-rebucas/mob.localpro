import { API } from '@/core/api/endpoints';
import { api } from '@/core/api/client';

export type WalletOverview = {
  currency: 'PHP';
  balance: number;
  reservedAmount: number;
  /** Last few rows from `GET /api/wallet` when the API embeds them. */
  recentActivity: WalletTransaction[];
};

export type WalletTransaction = {
  id: string;
  label: string;
  amount: number;
  createdAt: string;
};

export type WalletTransactionsPage = {
  items: WalletTransaction[];
  page: number;
  limit: number;
  hasMore: boolean;
};

type UnknownRecord = Record<string, unknown>;

function pickString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function mapTx(row: UnknownRecord, index: number): WalletTransaction {
  const amount = Number(row.amount ?? row.delta ?? row.value ?? 0);
  return {
    id: String(row._id ?? row.id ?? `tx-${index}`),
    label: String(
      row.label ?? row.description ?? row.title ?? row.type ?? row.reason ?? 'Transaction'
    ),
    amount: Number.isFinite(amount) ? amount : 0,
    createdAt: String(row.createdAt ?? row.date ?? new Date().toISOString()),
  };
}

function mapOverview(data: UnknownRecord): WalletOverview {
  const balance = Number(data.balance ?? 0);
  const reserved = Number(data.reservedAmount ?? data.escrow ?? 0);
  const rawTx = data.transactions;
  const recent =
    Array.isArray(rawTx) && rawTx.length
      ? (rawTx as UnknownRecord[]).map((row, i) => mapTx(row, i))
      : [];
  return {
    currency: 'PHP',
    balance: Number.isFinite(balance) ? balance : 0,
    reservedAmount: Number.isFinite(reserved) ? reserved : 0,
    recentActivity: recent.slice(0, 8),
  };
}

export const walletService = {
  async getOverview(): Promise<WalletOverview> {
    const { data } = await api.get<UnknownRecord>(API.wallet.get);
    return mapOverview(data);
  },

  async listTransactionsPage(page: number, limit = 20): Promise<WalletTransactionsPage> {
    const { data } = await api.get<UnknownRecord>(API.wallet.transactions, {
      params: { page, limit },
    });
    const rows = (data.transactions as UnknownRecord[] | undefined) ?? [];
    const items = rows.map((row, i) => mapTx(row, i));
    const lim = typeof data.limit === 'number' ? data.limit : limit;
    const pg = typeof data.page === 'number' ? data.page : page;
    const hasMore = items.length >= lim;
    return { items, page: pg, limit: lim, hasMore };
  },

  async createTopUp(amount: number): Promise<{ checkoutUrl: string; sessionId: string }> {
    const { data } = await api.post<{ checkoutUrl?: string; sessionId?: string; message?: string }>(
      API.wallet.topup,
      { amount }
    );
    const checkoutUrl = pickString(data.checkoutUrl);
    const sessionId = pickString(data.sessionId);
    if (!checkoutUrl || !sessionId) {
      throw new Error(data.message ?? 'Could not start top-up');
    }
    return { checkoutUrl, sessionId };
  },

  async verifyTopUp(sessionId: string): Promise<{ credited: boolean; amount?: number; balance?: number; message?: string }> {
    const { data } = await api.get<{
      credited?: boolean;
      amount?: number;
      balance?: number;
      message?: string;
    }>(API.wallet.topupVerify, { params: { sessionId } });
    return {
      credited: Boolean(data.credited),
      amount: typeof data.amount === 'number' ? data.amount : undefined,
      balance: typeof data.balance === 'number' ? data.balance : undefined,
      message: pickString(data.message),
    };
  },

  async requestWithdrawal(input: {
    amount: number;
    bankName: string;
    accountNumber: string;
    accountName: string;
  }): Promise<{ message?: string }> {
    const { data } = await api.post<{ message?: string }>(API.wallet.withdraw, {
      amount: input.amount,
      bankName: input.bankName.trim(),
      accountNumber: input.accountNumber.trim(),
      accountName: input.accountName.trim(),
    });
    return { message: pickString(data.message) };
  },
};
