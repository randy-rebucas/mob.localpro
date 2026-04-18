import { API } from '@/core/api/endpoints';
import { api } from '@/core/api/client';

export type LoyaltySummary = {
  points: number;
  tier: string;
};

type UnknownRecord = Record<string, unknown>;

export const loyaltyService = {
  async getSummary(): Promise<LoyaltySummary> {
    const fallback: LoyaltySummary = { points: 0, tier: 'bronze' };
    if (!__DEV__) {
      const { data } = await api.get<{ account?: UnknownRecord }>(API.loyalty.get);
      const acc = data.account as UnknownRecord | undefined;
      return {
        points: typeof acc?.points === 'number' ? acc.points : 0,
        tier: typeof acc?.tier === 'string' ? acc.tier : 'bronze',
      };
    }
    try {
      const { data } = await api.get<{ account?: UnknownRecord }>(API.loyalty.get);
      const acc = data.account as UnknownRecord | undefined;
      if (!acc) {
        return { points: 120, tier: 'silver' };
      }
      return {
        points: typeof acc.points === 'number' ? acc.points : 0,
        tier: typeof acc.tier === 'string' ? acc.tier : 'bronze',
      };
    } catch {
      return { points: 120, tier: 'silver' };
    }
  },
};
