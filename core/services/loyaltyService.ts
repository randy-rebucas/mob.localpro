import { API } from '@/core/api/endpoints';
import { api } from '@/core/api/client';

export type LoyaltySummary = {
  points: number;
  tier: string;
};

export type LoyaltyLedgerEntry = {
  points: number;
  reason: string;
  createdAt: string;
};

export type LoyaltyAccountPayload = {
  account: LoyaltySummary;
  ledger: LoyaltyLedgerEntry[];
};

export type LoyaltyReferralInfo = {
  referralCode: string;
  referralLink: string;
  referredCount: number;
};

type UnknownRecord = Record<string, unknown>;

function mapLedgerRow(row: UnknownRecord): LoyaltyLedgerEntry {
  return {
    points: typeof row.points === 'number' && Number.isFinite(row.points) ? row.points : 0,
    reason: typeof row.reason === 'string' ? row.reason : '',
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString(),
  };
}

function mapAccount(acc: UnknownRecord | undefined): LoyaltySummary {
  if (!acc) {
    return { points: 0, tier: 'bronze' };
  }
  return {
    points: typeof acc.points === 'number' && Number.isFinite(acc.points) ? acc.points : 0,
    tier: typeof acc.tier === 'string' && acc.tier.trim() ? acc.tier : 'bronze',
  };
}

export const loyaltyService = {
  /** Full `GET /api/loyalty` — account + ledger (last 20 per API). */
  async getAccount(): Promise<LoyaltyAccountPayload> {
    const { data } = await api.get<{ account?: UnknownRecord; ledger?: UnknownRecord[] }>(API.loyalty.get);
    const ledgerRaw = Array.isArray(data.ledger) ? data.ledger : [];
    return {
      account: mapAccount(data.account as UnknownRecord | undefined),
      ledger: ledgerRaw.map((r) => mapLedgerRow(r as UnknownRecord)),
    };
  },

  /** Convenience for callers that only need points + tier (same HTTP request as {@link getAccount}). */
  async getSummary(): Promise<LoyaltySummary> {
    const { account } = await loyaltyService.getAccount();
    return account;
  },

  async getReferral(): Promise<LoyaltyReferralInfo> {
    const { data } = await api.get<UnknownRecord>(API.loyalty.referral);
    return {
      referralCode: typeof data.referralCode === 'string' ? data.referralCode : '',
      referralLink: typeof data.referralLink === 'string' ? data.referralLink : '',
      referredCount: typeof data.referredCount === 'number' && Number.isFinite(data.referredCount) ? data.referredCount : 0,
    };
  },

  async redeem(points: number): Promise<LoyaltySummary> {
    const { data } = await api.post<{ account?: UnknownRecord }>(API.loyalty.redeem, { points });
    return mapAccount(data.account as UnknownRecord | undefined);
  },
};
