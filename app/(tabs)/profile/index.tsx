import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Image as ExpoImage } from 'expo-image';
import { router } from 'expo-router';
import { type ComponentProps, useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { BRAND } from '@/constants/brand';
import { pickAvatarFromLibrary } from '@/core/lib/profileAvatarPicker';
import { authService } from '@/core/services/authService';
import { profileService } from '@/core/services/profileService';
import { useSessionStore } from '@/core/stores/sessionStore';
import { useToastStore } from '@/core/stores/toastStore';
import type { MeProfile } from '@/core/types/profile';
import { getApiErrorMessage } from '@/core/utils/apiError';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

const AVATAR_SIZE = 72;
const ME_STALE_MS = 60_000;

function remoteAvatarSourceUri(url: string, cacheBust: number): string {
  if (cacheBust <= 0) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}cb=${cacheBust}`;
}

function formatRoleLabel(role: string): string {
  const r = role.trim().toLowerCase();
  if (r === 'provider') return 'Provider';
  if (r === 'client') return 'Client';
  return role.replace(/[-_]/g, ' ');
}

function addressesMenuSubtitle(me: MeProfile | undefined): string {
  if (!me?.addresses?.length) return 'For jobs and visits';
  const n = me.addresses.length;
  return n === 1 ? '1 saved address' : `${n} saved addresses`;
}

function ProfileMenuRow({
  icon,
  label,
  subtitle,
  onPress,
  disabled,
}: {
  icon: MaterialIconName;
  label: string;
  subtitle?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${label}. ${subtitle}` : label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => void Haptics.selectionAsync()}
      className="mb-2 flex-row items-center rounded-2xl border border-neutral-200/90 bg-white px-4 py-3.5 active:opacity-90 disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-900">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
        <MaterialIcons name={icon} size={22} color={BRAND.navy} />
      </View>
      <View className="min-w-0 flex-1 pl-3">
        <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{label}</Text>
        {subtitle ? <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</Text> : null}
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#a3a3a3" />
    </Pressable>
  );
}

function ProfileStatusChips({ me }: { me: MeProfile }) {
  return (
    <View className="mt-4 flex-row flex-wrap gap-2">
      {me.isEmailVerified ? (
        <View className="rounded-full bg-emerald-100 px-2.5 py-1 dark:bg-emerald-950/50">
          <Text className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Email verified</Text>
        </View>
      ) : (
        <View className="rounded-full bg-amber-100 px-2.5 py-1 dark:bg-amber-950/50">
          <Text className="text-xs font-semibold text-amber-900 dark:text-amber-200">Email not verified</Text>
        </View>
      )}
      {me.role ? (
        <View className="rounded-full bg-neutral-100 px-2.5 py-1 dark:bg-neutral-800">
          <Text className="text-xs font-semibold capitalize text-neutral-700 dark:text-neutral-300">
            {formatRoleLabel(me.role)}
          </Text>
        </View>
      ) : null}
      {me.accountType ? (
        <View className="rounded-full bg-neutral-100 px-2.5 py-1 dark:bg-neutral-800">
          <Text className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{me.accountType}</Text>
        </View>
      ) : null}
      {me.kycStatus && me.kycStatus !== 'none' ? (
        <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: `${BRAND.navy}18` }}>
          <Text style={{ color: BRAND.navy }} className="text-xs font-semibold capitalize">
            KYC: {me.kycStatus}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function ProfileHomeScreen() {
  const user = useSessionStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const uploadingAvatarRef = useRef(false);
  const [refreshing, setRefreshing] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [avatarRenderKey, setAvatarRenderKey] = useState(0);

  const meQuery = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => profileService.getMe(),
    enabled: !!user,
    staleTime: ME_STALE_MS,
  });
  const refetchMe = meQuery.refetch;

  const meForAvatar = meQuery.data;
  const remoteAvatarRaw = meForAvatar?.avatar ?? user?.avatar;
  const remoteAvatarTrimmed =
    remoteAvatarRaw && typeof remoteAvatarRaw === 'string' && remoteAvatarRaw.trim()
      ? remoteAvatarRaw.trim()
      : null;
  const localPreviewUri = uploadingAvatar && localAvatarUri ? localAvatarUri : null;
  const expoImageUri = useMemo(
    () =>
      localPreviewUri ??
      (remoteAvatarTrimmed ? remoteAvatarSourceUri(remoteAvatarTrimmed, avatarRenderKey) : null),
    [localPreviewUri, remoteAvatarTrimmed, avatarRenderKey]
  );

  const onRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      await refetchMe();
    } finally {
      setRefreshing(false);
    }
  }, [user, refetchMe]);

  const uploadAvatarAsset = useCallback(
    async (asset: { uri: string; mimeType?: string | null }) => {
      if (uploadingAvatarRef.current) return;
      uploadingAvatarRef.current = true;
      setLocalAvatarUri(asset.uri);
      setUploadingAvatar(true);
      try {
        const mimeType = asset.mimeType?.trim() || 'image/jpeg';
        const url = await profileService.uploadAvatar(asset.uri, mimeType);
        await queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
        const sessionUser = useSessionStore.getState().user;
        if (sessionUser) {
          useSessionStore.getState().setUser({ ...sessionUser, avatar: url });
        }
        setAvatarRenderKey((k) => k + 1);
        showToast('Profile photo updated');
      } catch (e) {
        Alert.alert('Error', getApiErrorMessage(e, 'Could not upload avatar. Please try again.'));
      } finally {
        uploadingAvatarRef.current = false;
        setUploadingAvatar(false);
        setLocalAvatarUri(null);
      }
    },
    [queryClient, showToast]
  );

  const handleAvatarChange = useCallback(() => {
    if (!user || uploadingAvatarRef.current) return;
    void (async () => {
      const r = await pickAvatarFromLibrary();
      if (r.ok) await uploadAvatarAsset(r.asset);
      else if (r.reason === 'denied') {
        showToast('Allow photo library access in Settings to choose a photo.', 'error');
      }
    })();
  }, [user, uploadAvatarAsset, showToast]);

  const onSignOut = useCallback(async () => {
    setSigningOut(true);
    try {
      await authService.logout();
      showToast('Signed out');
      router.replace('/login');
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Could not sign out'), 'error');
    } finally {
      setSigningOut(false);
    }
  }, [showToast]);

  if (!user) {
    return (
      <ScrollView
        className="flex-1 bg-[#eef2f7] dark:bg-neutral-950"
        contentContainerClassName="grow px-5 pb-10 pt-4"
        keyboardShouldPersistTaps="handled">
        <FeatureEmptyState
          variant="compact"
          icon="person"
          title="Sign in for your profile"
          description="Sync your name and photo, save addresses for jobs, and control notifications in one place."
          primaryAction={{
            label: 'Sign in',
            onPress: () => router.push('/login'),
            accessibilityLabel: 'Sign in',
          }}
        />
      </ScrollView>
    );
  }

  if (meQuery.isPending) {
    return (
      <View className="flex-1 gap-4 bg-[#eef2f7] px-5 pb-10 pt-4 dark:bg-neutral-950">
        <View className="overflow-hidden rounded-3xl border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <View className="flex-row items-center gap-4">
            <View style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }} className="overflow-hidden rounded-full">
              <SkeletonBlock className="h-full w-full rounded-full" />
            </View>
            <View className="min-w-0 flex-1 gap-2">
              <SkeletonBlock className="h-6 w-3/5 rounded-lg" />
              <SkeletonBlock className="h-4 w-full rounded-lg" />
            </View>
          </View>
          <View className="mt-4 flex-row gap-2">
            <SkeletonBlock className="h-7 w-24 rounded-full" />
            <SkeletonBlock className="h-7 w-20 rounded-full" />
          </View>
        </View>
        <SkeletonBlock className="h-14 w-full rounded-2xl" />
        <SkeletonBlock className="h-14 w-full rounded-2xl" />
        <SkeletonBlock className="h-14 w-full rounded-2xl" />
      </View>
    );
  }

  if (meQuery.isError) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Text className="text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">Profile unavailable</Text>
        <Text className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
          {getApiErrorMessage(meQuery.error)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry loading profile"
          onPress={() => void meQuery.refetch()}
          className="mt-8 self-center rounded-2xl px-8 py-3.5 active:opacity-90"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  const me = meQuery.data;

  const displayName = me?.displayName ?? user.displayName ?? 'Member';
  const displayEmail = me?.email ?? user.email ?? '';

  return (
    <ScrollView
      className="flex-1 bg-[#eef2f7] dark:bg-neutral-950"
      contentContainerClassName="grow px-5 pb-10 pt-4"
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor={BRAND.navy}
          colors={[BRAND.navy]}
        />
      }>
      <View className="overflow-hidden rounded-3xl border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <View className="flex-row items-center gap-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            accessibilityHint="Opens your photo library to choose a square image"
            accessibilityState={{ disabled: uploadingAvatar, busy: uploadingAvatar }}
            disabled={uploadingAvatar}
            onPress={handleAvatarChange}
            onPressIn={() => void Haptics.selectionAsync()}
            className="relative active:opacity-90">
            {expoImageUri ? (
              <View
                className="relative overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700"
                style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}>
                <ExpoImage
                  key={`${expoImageUri}-${avatarRenderKey}`}
                  source={{ uri: expoImageUri }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                  contentPosition="center"
                  accessibilityLabel="Profile photo"
                  cachePolicy="disk"
                  transition={0}
                />
                {uploadingAvatar ? (
                  <View
                    className="items-center justify-center rounded-full bg-black/40"
                    style={StyleSheet.absoluteFillObject}>
                    <ActivityIndicator color="#ffffff" />
                  </View>
                ) : null}
              </View>
            ) : (
              <View
                className="items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700"
                style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}>
                <MaterialIcons name="person" size={38} color="#737373" />
              </View>
            )}
            {!uploadingAvatar ? (
              <View
                className="absolute -bottom-0.5 -right-0.5 h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-neutral-800 dark:border-neutral-900 dark:bg-neutral-700"
                pointerEvents="none">
                <MaterialIcons name="photo-camera" size={14} color="#ffffff" />
              </View>
            ) : (
              <View
                className="absolute -bottom-0.5 -right-0.5 h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-neutral-600 dark:border-neutral-900"
                pointerEvents="none">
                <ActivityIndicator size="small" color="#ffffff" />
              </View>
            )}
          </Pressable>
          <View className="min-w-0 flex-1">
            <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
              {displayName}
            </Text>
            <Text className="mt-1 text-sm text-neutral-600 dark:text-neutral-400" numberOfLines={2}>
              {displayEmail || 'No email on file'}
            </Text>
          </View>
        </View>
        {me ? <ProfileStatusChips me={me} /> : null}
      </View>

      <Text className="mb-2 mt-8 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Account
      </Text>
      <ProfileMenuRow
        icon="place"
        label="Saved addresses"
        subtitle={addressesMenuSubtitle(me)}
        onPress={() => router.push('/profile/addresses' as never)}
      />
      <ProfileMenuRow
        icon="tune"
        label="Settings"
        subtitle="Notifications and privacy"
        onPress={() => router.push('/profile/settings' as never)}
      />
      <ProfileMenuRow
        icon="account-balance-wallet"
        label="Wallet"
        subtitle="Balance, top-up, withdrawals"
        onPress={() => router.push('/wallet' as never)}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        accessibilityHint="Ends your session on this device"
        accessibilityState={{ disabled: signingOut, busy: signingOut }}
        disabled={signingOut}
        onPress={() => void onSignOut()}
        onPressIn={() => void Haptics.selectionAsync()}
        className="mt-8 flex-row items-center justify-center rounded-2xl border-2 border-red-200 bg-white py-4 active:opacity-90 dark:border-red-900/60 dark:bg-neutral-900">
        {signingOut ? (
          <ActivityIndicator color="#b91c1c" />
        ) : (
          <Text className="text-center text-base font-semibold text-red-700 dark:text-red-400">Sign out</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
