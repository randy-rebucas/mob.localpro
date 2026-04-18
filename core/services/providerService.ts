import { API } from '@/core/api/endpoints';
import { api } from '@/core/api/client';

type UnknownRecord = Record<string, unknown>;

export type ProviderAvailability = 'available' | 'busy' | 'unavailable';

export type ProviderListItem = {
  id: string;
  displayName: string;
  subtitle?: string;
  isFavorite?: boolean;
  avatarUrl?: string;
  availability?: ProviderAvailability;
  /** Up to a few skill labels for list rows */
  skills: string[];
  avgRating?: number;
  reviewCount?: number;
  /** Primary city / service area label when API sends `city` or `address.city` */
  city?: string;
  /** Hourly rate in PHP when API sends a number */
  hourlyRate?: number;
  /** Service category when present */
  category?: string;
  /** Distance km (nearby) */
  distanceKm?: number;
  /** Map pin when API includes coordinates on list rows */
  lat?: number;
  lng?: number;
};

export type ProviderProfile = {
  userId: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  availability?: ProviderAvailability;
  skills: { skill: string; yearsExperience?: number; hourlyRate?: string }[];
  avgRating: number;
  completedJobCount: number;
  reviewCount?: number;
  breakdown?: Record<string, number>;
  streak?: number;
  /** Service category when API includes it */
  category?: string;
  subcategories?: string[];
  hourlyRate?: number;
  responseRatePercent?: number;
  avgResponseTimeMinutes?: number;
  acceptanceRatePercent?: number;
};

export type ProviderReviewRow = {
  id: string;
  rating?: number;
  title?: string;
  body: string;
  createdAt: string;
  authorLabel?: string;
};

export type ProviderListParams = {
  search?: string;
  availability?: 'available' | 'busy' | 'unavailable';
};

export function formatProviderAvailability(a: ProviderAvailability | undefined): string {
  if (!a) return '';
  if (a === 'available') return 'Available';
  if (a === 'busy') return 'Busy';
  return 'Unavailable';
}

function pickString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

/** First non-empty trimmed string among candidates. */
function firstNonEmpty(...candidates: unknown[]): string | undefined {
  for (const c of candidates) {
    const s = pickString(c)?.trim();
    if (s) return s;
  }
  return undefined;
}

function combineFirstLast(first: unknown, last: unknown): string | undefined {
  const a = pickString(first)?.trim();
  const b = pickString(last)?.trim();
  if (a && b) return `${a} ${b}`;
  return a ?? b;
}

/**
 * Resolves a human-readable provider label from list/detail API shapes
 * (flat row, `{ provider }` wrapper, nested `user`, `businessName`, etc.).
 */
function pickProviderDisplayName(...sources: UnknownRecord[]): string {
  for (const src of sources) {
    const profile = src.profile as UnknownRecord | undefined;
    const user = src.user as UnknownRecord | undefined;
    const label = firstNonEmpty(
      src.businessName,
      src.name,
      src.displayName,
      src.title,
      profile?.businessName,
      profile?.displayName,
      profile?.title,
      profile?.name,
      combineFirstLast(profile?.firstName, profile?.lastName),
      user?.businessName,
      user?.displayName,
      user?.name,
      user?.fullName,
      combineFirstLast(user?.firstName, user?.lastName),
      combineFirstLast(src.firstName, src.lastName)
    );
    if (label) return label;
  }
  return 'Provider';
}

function pickNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function normalizeAvailability(raw: unknown): ProviderAvailability | undefined {
  const s = pickString(raw)?.toLowerCase();
  if (s === 'available' || s === 'busy' || s === 'unavailable') return s;
  return undefined;
}

function pickAvatarUrl(row: UnknownRecord, user?: UnknownRecord): string | undefined {
  const profile = row.profile as UnknownRecord | undefined;
  const from = [
    row.avatar,
    row.avatarUrl,
    row.photoUrl,
    row.imageUrl,
    row.profilePhoto,
    profile?.avatar,
    profile?.photoUrl,
    profile?.avatarUrl,
    profile?.imageUrl,
    user?.avatar,
    user?.avatarUrl,
    user?.photoUrl,
    user?.imageUrl,
    (user?.profile as UnknownRecord | undefined)?.photoUrl,
    (user?.profile as UnknownRecord | undefined)?.avatar,
  ];
  for (const c of from) {
    const u = pickString(c);
    if (u) return u;
  }
  return undefined;
}

/** Skill names for compact list display (strings or `{ skill, name }`). */
function extractSkillLabels(raw: unknown, max: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const s of raw) {
    if (out.length >= max) break;
    if (typeof s === 'string' && s.trim()) {
      out.push(s.trim());
      continue;
    }
    if (s && typeof s === 'object') {
      const o = s as UnknownRecord;
      const label = pickString(o.skill) ?? pickString(o.name) ?? pickString(o.label);
      if (label) out.push(label);
    }
  }
  return out;
}

function extractRows(data: unknown): UnknownRecord[] {
  if (Array.isArray(data)) return data as UnknownRecord[];
  if (data && typeof data === 'object' && 'providers' in data && Array.isArray((data as { providers: unknown }).providers)) {
    return (data as { providers: UnknownRecord[] }).providers;
  }
  if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data: unknown }).data)) {
    return (data as { data: UnknownRecord[] }).data;
  }
  if (data && typeof data === 'object' && 'reviews' in data && Array.isArray((data as { reviews: unknown }).reviews)) {
    return (data as { reviews: UnknownRecord[] }).reviews;
  }
  if (data && typeof data === 'object' && 'favorites' in data && Array.isArray((data as { favorites: unknown }).favorites)) {
    return (data as { favorites: UnknownRecord[] }).favorites;
  }
  if (data && typeof data === 'object' && 'results' in data && Array.isArray((data as { results: unknown }).results)) {
    return (data as { results: UnknownRecord[] }).results;
  }
  if (data && typeof data === 'object' && 'savedProviders' in data && Array.isArray((data as { savedProviders: unknown }).savedProviders)) {
    return (data as { savedProviders: UnknownRecord[] }).savedProviders;
  }
  return [];
}

/**
 * Unwraps `{ provider: { profile, … } }` detail payloads from the discovery guide
 * onto a single record for existing profile mappers.
 */
function mergeProviderDetailEnvelope(raw: UnknownRecord): UnknownRecord {
  const wrapped = raw.provider;
  if (!wrapped || typeof wrapped !== 'object') return raw;
  const p = wrapped as UnknownRecord;
  const prof = (p.profile as UnknownRecord) ?? {};
  const mergedProfile = Object.keys(prof).length > 0 ? prof : ((raw.profile as UnknownRecord) ?? {});
  return {
    ...raw,
    ...p,
    user: (raw.user ?? p.user) as unknown,
    profile: mergedProfile,
    userId: p.id ?? p.userId ?? raw.userId,
  };
}

function mapListItem(row: UnknownRecord): ProviderListItem {
  const wrapped = row.provider as UnknownRecord | undefined;
  const core = wrapped && typeof wrapped === 'object' ? wrapped : row;
  const user = (row.user ?? core.user) as UnknownRecord | undefined;
  const profile = (row.profile ?? core.profile) as UnknownRecord | undefined;

  const name = pickProviderDisplayName(row, core, profile ?? {}, user ?? {});

  const coords = (row.coordinates ?? core.coordinates) as UnknownRecord | undefined;
  const loc = (row.location ?? core.location) as UnknownRecord | undefined;
  const addr = (row.address ?? core.address) as UnknownRecord | undefined;
  const lat =
    pickNumber(row.lat) ??
    pickNumber(core.lat) ??
    pickNumber(coords?.lat) ??
    pickNumber(loc?.lat) ??
    pickNumber(addr?.lat);
  const lng =
    pickNumber(row.lng) ??
    pickNumber(core.lng) ??
    pickNumber(coords?.lng) ??
    pickNumber(loc?.lng) ??
    pickNumber(addr?.lng);

  const skillsRaw = row.skills ?? core.skills ?? user?.skills ?? profile?.skills;
  const skills = extractSkillLabels(skillsRaw, 5);
  const rating =
    pickNumber(row.avgRating) ??
    pickNumber(core.avgRating) ??
    pickNumber(row.rating) ??
    pickNumber(core.rating) ??
    pickNumber(profile?.avgRating) ??
    pickNumber(user?.avgRating);
  const reviews =
    pickNumber(row.reviewCount) ??
    pickNumber(core.reviewCount) ??
    pickNumber(row.reviewsCount) ??
    pickNumber(core.reviewsCount) ??
    pickNumber(row.totalReviews) ??
    pickNumber(core.totalReviews) ??
    pickNumber(profile?.totalReviews);
  const bioSnippet = pickString(row.bio) ?? pickString(core.bio) ?? pickString(profile?.bio);
  const city =
    pickString(row.city) ??
    pickString(core.city) ??
    pickString(addr?.city) ??
    pickString(addr?.municipality);
  const hourlyRate =
    pickNumber(row.hourlyRate) ?? pickNumber(core.hourlyRate) ?? pickNumber(profile?.hourlyRate);
  const category = pickString(row.category) ?? pickString(core.category);
  const distanceKm = pickNumber(row.distance) ?? pickNumber(core.distance);

  const nestedProviderId =
    wrapped && typeof wrapped === 'object'
      ? (wrapped as UnknownRecord)._id ?? (wrapped as UnknownRecord).id
      : undefined;
  const id = String(
    row.providerId ??
      nestedProviderId ??
      row._id ??
      row.id ??
      row.userId ??
      core._id ??
      core.id ??
      core.userId ??
      user?._id ??
      user?.id ??
      ''
  );

  return {
    id,
    displayName: name,
    subtitle:
      pickString(row.headline) ??
      pickString(core.headline) ??
      (bioSnippet ? bioSnippet.slice(0, 80) : undefined),
    isFavorite: typeof row.isFavorite === 'boolean' ? row.isFavorite : typeof core.isFavorite === 'boolean' ? core.isFavorite : undefined,
    avatarUrl: pickAvatarUrl(row, user) ?? pickAvatarUrl(core, user) ?? pickAvatarUrl(profile ?? {}, user),
    availability: normalizeAvailability(
      row.availabilityStatus ?? row.availability ?? core.availabilityStatus ?? core.availability ?? profile?.availabilityStatus ?? user?.availabilityStatus
    ),
    skills,
    avgRating: rating,
    reviewCount: reviews,
    city,
    hourlyRate,
    category,
    distanceKm,
    lat,
    lng,
  };
}

function mapSkillEntry(s: unknown): ProviderProfile['skills'][0] | null {
  if (typeof s === 'string') return { skill: s };
  if (!s || typeof s !== 'object') return null;
  const o = s as UnknownRecord;
  const skill = pickString(o.skill) ?? pickString(o.name) ?? pickString(o.label);
  if (!skill) return null;
  return {
    skill,
    yearsExperience: pickNumber(o.yearsExperience),
    hourlyRate: pickString(o.hourlyRate) ?? (typeof o.hourlyRate === 'number' ? String(o.hourlyRate) : undefined),
  };
}

export const providerService = {
  async list(params?: ProviderListParams): Promise<ProviderListItem[]> {
    const q = params?.search?.trim() ?? '';
    const { data } = await api.get<unknown>(API.providers.list, {
      params: {
        ...(q ? { search: q, q } : {}),
        ...(params?.availability ? { availability: params.availability } : {}),
      },
    });
    return extractRows(data).map(mapListItem).filter((p) => p.id.length > 0);
  },

  async getProfile(providerId: string): Promise<ProviderProfile> {
    const { data: raw } = await api.get<UnknownRecord>(API.providers.profileById(providerId));
    const data = mergeProviderDetailEnvelope(raw);
    const skillsRaw = data.skills;
    const skillsArr = Array.isArray(skillsRaw) ? skillsRaw : [];
    const skills = skillsArr.map(mapSkillEntry).filter(Boolean) as ProviderProfile['skills'];
    const breakdown = data.breakdown;
    const user = data.user as UnknownRecord | undefined;
    const profile = data.profile as UnknownRecord | undefined;
    const displayName = pickProviderDisplayName(data, profile ?? {}, user ?? {});
    const avgRating =
      pickNumber(data.avgRating) ??
      pickNumber(data.rating) ??
      pickNumber(profile?.avgRating) ??
      0;
    const completedJobCount =
      pickNumber(data.completedJobCount) ??
      pickNumber(data.completedJobs) ??
      pickNumber(profile?.completedJobs) ??
      0;
    const reviewCount =
      pickNumber(data.reviewCount) ??
      pickNumber(data.reviewsCount) ??
      pickNumber(data.totalReviews) ??
      pickNumber(profile?.totalReviews);
    const subcategoriesRaw = data.subcategories;
    const subcategories = Array.isArray(subcategoriesRaw)
      ? subcategoriesRaw.filter((x): x is string => typeof x === 'string')
      : undefined;
    return {
      userId: String(data.userId ?? profile?.providerId ?? profile?.userId ?? user?._id ?? user?.id ?? providerId),
      displayName,
      bio: pickString(data.bio) ?? pickString(profile?.bio) ?? '',
      avatarUrl: pickAvatarUrl(data, user) ?? pickAvatarUrl(profile ?? {}, user),
      availability: normalizeAvailability(
        data.availabilityStatus ??
          data.availability ??
          profile?.availabilityStatus ??
          profile?.availability ??
          user?.availabilityStatus
      ),
      skills,
      avgRating,
      completedJobCount,
      reviewCount,
      breakdown:
        breakdown && typeof breakdown === 'object' && !Array.isArray(breakdown)
          ? (breakdown as Record<string, number>)
          : undefined,
      streak: pickNumber(data.streak) ?? pickNumber(profile?.streak),
      category: pickString(data.category) ?? pickString(profile?.category),
      subcategories,
      hourlyRate: pickNumber(data.hourlyRate) ?? pickNumber(profile?.hourlyRate),
      responseRatePercent: pickNumber(data.responseRatePercent) ?? pickNumber(profile?.responseRatePercent),
      avgResponseTimeMinutes: pickNumber(data.avgResponseTimeMinutes) ?? pickNumber(profile?.avgResponseTimeMinutes),
      acceptanceRatePercent: pickNumber(data.acceptanceRatePercent) ?? pickNumber(profile?.acceptanceRatePercent),
    };
  },

  async listReviews(providerId: string): Promise<ProviderReviewRow[]> {
    const { data } = await api.get<unknown>(API.reviews.byProvider(providerId));
    const rows = extractRows(data);
    return rows.map((row) => ({
      id: String(row._id ?? row.id ?? ''),
      rating: pickNumber(row.rating) ?? pickNumber(row.stars),
      title: pickString(row.title),
      body: pickString(row.body) ?? pickString(row.comment) ?? '',
      createdAt: pickString(row.createdAt) ?? new Date().toISOString(),
      authorLabel: pickString(row.authorName) ?? pickString((row.author as UnknownRecord | undefined)?.displayName),
    }));
  },

  async listFavoriteIds(): Promise<Set<string>> {
    const { data } = await api.get<unknown>(API.favorites.list);
    const rows = extractRows(data);
    const ids = new Set<string>();
    for (const row of rows) {
      const prov = row.provider as UnknownRecord | undefined;
      const id = String(
        row.providerId ?? prov?._id ?? prov?.id ?? row.userId ?? row.providerUserId ?? row._id ?? row.id ?? ''
      );
      if (id) ids.add(id);
    }
    return ids;
  },

  async addFavorite(providerId: string): Promise<void> {
    await api.post(API.favorites.create, { providerId });
  },

  async removeFavorite(providerId: string): Promise<void> {
    await api.delete(API.favorites.byProvider(providerId));
  },
};
