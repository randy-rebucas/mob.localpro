import { api } from '@/core/api/client';

export type WalletBalance = { currency: string; available: number; escrow: number };

export type WalletTransaction = {
  id: string;
  label: string;
  amount: number;
  createdAt: string;
};

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

export const paymentService = {
  async getWallet(): Promise<WalletBalance> {
    if (__DEV__) {
      return MOCK_WALLET;
    }
    const { data } = await api.get<WalletBalance>('/api/wallet');
    return data;
  },

  async listTransactions(): Promise<WalletTransaction[]> {
    if (__DEV__) {
      return MOCK_TX;
    }
    const { data } = await api.get<WalletTransaction[]>('/api/wallet/transactions');
    return data;
  },
};
