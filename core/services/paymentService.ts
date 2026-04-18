import { API } from '@/core/api/endpoints';
import { api } from '@/core/api/client';

export type WalletBalance = { currency: string; available: number; escrow: number };

export type WalletTransaction = {
  id: string;
  label: string;
  amount: number;
  createdAt: string;
};

type UnknownRecord = Record<string, unknown>;

const MOCK_WALLET: WalletBalance = { currency: 'PHP', available: 12500, escrow: 3200 };

const MOCK_TX: WalletTransaction[] = [
  {
    id: 'tx-1',
    label: 'Escrow hold — Installation job',
    amount: -3200,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'tx-2',
    label: 'Top up via bank',
    amount: 5000,
    createdAt: new Date().toISOString(),
  },
];

function mapTx(row: UnknownRecord, index: number): WalletTransaction {
  return {
    id: String(row._id ?? row.id ?? `tx-${index}`),
    label: String(row.label ?? row.description ?? row.type ?? 'Transaction'),
    amount: Number(row.amount ?? row.delta ?? 0),
    createdAt: String(row.createdAt ?? new Date().toISOString()),
  };
}

export const paymentService = {
  async getWallet(): Promise<WalletBalance> {
    if (!__DEV__) {
      const { data } = await api.get<{ balance: number; reservedAmount?: number }>(API.wallet.get);
      return {
        currency: 'PHP',
        available: data.balance,
        escrow: data.reservedAmount ?? 0,
      };
    }
    try {
      const { data } = await api.get<{ balance?: number; reservedAmount?: number }>(API.wallet.get);
      if (data.balance == null) {
        return MOCK_WALLET;
      }
      return {
        currency: 'PHP',
        available: data.balance,
        escrow: data.reservedAmount ?? 0,
      };
    } catch {
      return MOCK_WALLET;
    }
  },

  async listTransactions(): Promise<WalletTransaction[]> {
    if (!__DEV__) {
      const { data } = await api.get<{ transactions?: UnknownRecord[] }>(API.wallet.transactions);
      return (data.transactions ?? []).map(mapTx);
    }
    try {
      const { data } = await api.get<{ transactions?: UnknownRecord[] }>(API.wallet.transactions);
      return (data.transactions ?? []).map(mapTx);
    } catch {
      return MOCK_TX;
    }
  },
};
