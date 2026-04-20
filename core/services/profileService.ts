import { Platform } from 'react-native';

import { API } from '@/core/api/endpoints';
import { userFromApi } from '@/core/api/normalize';
import { api } from '@/core/api/client';
import { refreshSessionRequest } from '@/core/api/sessionRefresh';
import { API_BASE_URL } from '@/core/constants/env';
import { captureCsrfTokenFromJsonBody, captureCsrfTokenFromResponseHeaders, csrfHeaderFields } from '@/core/lib/csrf';
import { extractPublicUrlFromUploadResponse, pickErrorMessage } from '@/core/services/uploadResponseParse';
import type { MeProfile, NotificationPreferences, SavedAddress } from '@/core/types/profile';
import type { User } from '@/core/types/models';
import { useSessionStore } from '@/core/stores/sessionStore';

type UnknownRecord = Record<string, unknown>;

function pickString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function pickNumber(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function mapAddress(row: UnknownRecord): SavedAddress {
  const coords = row.coordinates as UnknownRecord | undefined;
  return {
    id: String(row._id ?? row.id ?? ''),
    label: String(row.label ?? ''),
    line: String(row.address ?? ''),
    isDefault: Boolean(row.isDefault),
    lat: pickNumber(coords?.lat),
    lng: pickNumber(coords?.lng),
  };
}

function defaultEmailCategories(): NotificationPreferences['emailCategories'] {
  return {
    jobUpdates: true,
    quoteAlerts: true,
    paymentAlerts: true,
    messages: true,
  };
}

function mapPreferences(raw: UnknownRecord | undefined): NotificationPreferences {
  const ec = (raw?.emailCategories as UnknownRecord | undefined) ?? {};
  return {
    emailNotifications: Boolean(raw?.emailNotifications ?? true),
    pushNotifications: Boolean(raw?.pushNotifications ?? true),
    smsNotifications: Boolean(raw?.smsNotifications ?? false),
    marketingEmails: Boolean(raw?.marketingEmails ?? false),
    profileVisible: Boolean(raw?.profileVisible ?? true),
    emailCategories: {
      jobUpdates: Boolean(ec.jobUpdates ?? true),
      quoteAlerts: Boolean(ec.quoteAlerts ?? true),
      paymentAlerts: Boolean(ec.paymentAlerts ?? true),
      messages: Boolean(ec.messages ?? true),
    },
  };
}

async function appendAvatarFileToFormData(form: FormData, uri: string, mimeType: string): Promise<void> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    form.append('file', blob, 'avatar.jpg');
    return;
  }
  form.append('file', { uri, name: 'avatar.jpg', type: mimeType } as unknown as Blob);
}

function mapMeProfile(raw: UnknownRecord): MeProfile {
  const u = userFromApi(raw);
  const addrsRaw = raw.addresses;
  const addresses = Array.isArray(addrsRaw) ? (addrsRaw as UnknownRecord[]).map(mapAddress) : [];
  return {
    id: u.id,
    displayName: u.displayName,
    email: u.email,
    role: u.role,
    isEmailVerified: typeof raw.isEmailVerified === 'boolean' ? raw.isEmailVerified : undefined,
    avatar: raw.avatar === null ? null : pickString(raw.avatar),
    accountType: pickString(raw.accountType),
    kycStatus: pickString(raw.kycStatus),
    addresses,
  };
}

export const profileService = {
  /** Full `GET /api/auth/me` profile; syncs session `user` for name/email drift. */
  async getMe(): Promise<MeProfile> {
    const { data } = await api.get<UnknownRecord>(API.auth.me);
    const profile = mapMeProfile(data);
    const sessionUser: User = {
      id: profile.id,
      displayName: profile.displayName,
      email: profile.email,
      role: profile.role,
      avatar: profile.avatar,
    };
    useSessionStore.getState().setUser(sessionUser);
    return profile;
  },

  /**
   * `POST /api/auth/me/avatar` — multipart `file` (see `avatar-upload-implementation.md`).
   * Uses `fetch` (same rationale as `uploadPublicImage`) so multipart is not sent as JSON and
   * each attempt builds a fresh `FormData` (401 refresh retry is safe).
   */
  async uploadAvatar(uri: string, mimeType = 'image/jpeg'): Promise<string> {
    const base = API_BASE_URL.replace(/\/$/, '');
    const path = API.auth.meAvatar.startsWith('/') ? API.auth.meAvatar : `/${API.auth.meAvatar}`;
    const requestUrl = `${base}${path}`;

    async function postOnce(): Promise<Response> {
      const form = new FormData();
      await appendAvatarFileToFormData(form, uri, mimeType);
      const csrf = await csrfHeaderFields();
      return fetch(requestUrl, {
        method: 'POST',
        body: form,
        credentials: 'include',
        headers: { Accept: 'application/json', ...csrf },
      });
    }

    let res = await postOnce();
    if (res.status === 401) {
      const refreshedUser = await refreshSessionRequest();
      if (refreshedUser) {
        useSessionStore.getState().setUser(refreshedUser);
      }
      res = await postOnce();
    }

    const text = await res.text();
    let data: unknown = {};
    if (text) {
      try {
        data = JSON.parse(text) as unknown;
      } catch {
        throw new Error(`Avatar upload failed (${res.status}): response was not JSON`);
      }
    }

    if (!res.ok) {
      captureCsrfTokenFromResponseHeaders(res.headers);
      throw new Error(pickErrorMessage(data, res.status));
    }

    captureCsrfTokenFromResponseHeaders(res.headers);
    captureCsrfTokenFromJsonBody(data);

    const publicUrl = extractPublicUrlFromUploadResponse(data);
    if (!publicUrl) {
      throw new Error('Upload succeeded but no avatar URL was returned.');
    }
    return publicUrl;
  },

  async listAddresses(): Promise<SavedAddress[]> {
    try {
      const { data } = await api.get<{ addresses?: UnknownRecord[] }>(API.auth.meAddress);
      if (Array.isArray(data.addresses)) {
        return data.addresses.map(mapAddress);
      }
    } catch {
      // Some deployments only embed addresses on GET /api/auth/me
    }
    const me = await profileService.getMe();
    return me.addresses;
  },

  async addAddress(input: {
    label: string;
    address: string;
    coordinates?: { lat: number; lng: number };
    isDefault?: boolean;
  }): Promise<SavedAddress[]> {
    const { data } = await api.post<{ addresses?: UnknownRecord[] }>(API.auth.meAddress, {
      label: input.label.trim(),
      address: input.address.trim(),
      ...(input.coordinates ? { coordinates: input.coordinates } : {}),
      ...(typeof input.isDefault === 'boolean' ? { isDefault: input.isDefault } : {}),
    });
    return (data.addresses ?? []).map(mapAddress);
  },

  async updateAddress(
    id: string,
    patch: {
      label?: string;
      address?: string;
      isDefault?: boolean;
      coordinates?: { lat: number; lng: number };
    }
  ): Promise<SavedAddress[]> {
    const { data } = await api.patch<{ addresses?: UnknownRecord[] }>(API.auth.meAddressById(id), patch);
    return (data.addresses ?? []).map(mapAddress);
  },

  async deleteAddress(id: string): Promise<SavedAddress[]> {
    const { data } = await api.delete<{ addresses?: UnknownRecord[] }>(API.auth.meAddressById(id));
    return (data.addresses ?? []).map(mapAddress);
  },

  async getPreferences(): Promise<NotificationPreferences> {
    const { data } = await api.get<{ preferences?: UnknownRecord }>(API.auth.mePreferences);
    return mapPreferences(data.preferences as UnknownRecord | undefined);
  },

  async updatePreferences(patch: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const body: UnknownRecord = { ...patch };
    if (patch.emailCategories) {
      body.emailCategories = patch.emailCategories;
    }
    const { data } = await api.put<{ preferences?: UnknownRecord }>(API.auth.mePreferences, body);
    return mapPreferences(data.preferences as UnknownRecord | undefined);
  },

  async requestDataDeletion(reason?: string): Promise<{ message?: string }> {
    const { data } = await api.post<{ message?: string }>(API.user.deleteRequest, reason?.trim() ? { reason: reason.trim() } : {});
    return { message: pickString(data.message) };
  },

  /** Returns parsed JSON export payload (can be large). */
  async exportPersonalData(): Promise<unknown> {
    const { data } = await api.get(API.user.export);
    return data;
  },
};
