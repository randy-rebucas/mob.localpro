import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ComponentProps, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { BRAND } from '@/constants/brand';
import { pickAvatarFromCamera, pickAvatarFromLibrary } from '@/core/lib/profileAvatarPicker';
import { authService } from '@/core/services/authService';
import { profileService } from '@/core/services/profileService';
import { useSessionStore } from '@/core/stores/sessionStore';
import { useToastStore } from '@/core/stores/toastStore';
import { getApiErrorMessage } from '@/core/utils/apiError';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

function MenuRow({
  icon,
  label,
  subtitle,
  onPress,
}: {
  icon: MaterialIconName;
  label: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="mb-2 flex-row items-center rounded-2xl border border-neutral-200/90 bg-white px-4 py-3.5 active:opacity-90 dark:border-neutral-800 dark:bg-neutral-900">
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

export default function ProfileHomeScreen() {
  const user = useSessionStore((s) => s.user);
  const showToast = useToastStore((s) => s.show);
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const meQuery = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: () => profileService.getMe(),
    enabled: !!user,
  });

  async function uploadAvatarAsset(asset: { uri: string; mimeType?: string | null; fileName?: string | null }) {
    setUploadingAvatar(true);
    try {
      const updated = await profileService.updateAvatarFromLocalUri(asset.uri, {
        mimeType: asset.mimeType,
        fileName: asset.fileName,
      });
      queryClient.setQueryData(['profile', 'me'], updated);
      showToast('Profile photo updated');
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Could not update profile photo'), 'error');
    } finally {
      setUploadingAvatar(false);
    }
  }

  function openAvatarSourcePicker() {
    if (!user) return;

    const chooseLibrary = () => {
      void (async () => {
        const r = await pickAvatarFromLibrary();
        if (r.ok) await uploadAvatarAsset(r.asset);
        else if (r.reason === 'denied') {
          showToast('Allow photo library access in Settings to choose a photo.', 'error');
        }
      })();
    };

    const chooseCamera = () => {
      void (async () => {
        const r = await pickAvatarFromCamera();
        if (r.ok) await uploadAvatarAsset(r.asset);
        else if (r.reason === 'denied') {
          showToast('Allow camera access in Settings to take a photo.', 'error');
        }
      })();
    };

    if (Platform.OS === 'web') {
      void (async () => {
        const r = await pickAvatarFromLibrary();
        if (r.ok) await uploadAvatarAsset(r.asset);
        else if (r.reason === 'denied') {
          showToast('Allow access to photos to set your profile picture.', 'error');
        }
      })();
      return;
    }

    Alert.alert('Profile photo', 'How would you like to add a photo?', [
      { text: 'Take photo', onPress: chooseCamera },
      { text: 'Choose from library', onPress: chooseLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function onSignOut() {
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
  }

  if (user && meQuery.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-[#eef2f7] dark:bg-neutral-950">
        <ActivityIndicator color={BRAND.navy} />
      </View>
    );
  }

  if (user && meQuery.isError) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Text className="text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">Profile unavailable</Text>
        <Text className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">{getApiErrorMessage(meQuery.error)}</Text>
        <Pressable
          onPress={() => void meQuery.refetch()}
          className="mt-8 self-center rounded-2xl px-8 py-3.5 active:opacity-90"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  const me = meQuery.data;

  return (
    <ScrollView className="flex-1 bg-[#eef2f7] dark:bg-neutral-950" contentContainerClassName="grow px-5 pb-10 pt-4">
      <View className="overflow-hidden rounded-3xl border border-neutral-200/80 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <View className="flex-row items-center gap-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={user ? 'Change profile photo' : undefined}
            disabled={!user || uploadingAvatar || meQuery.isFetching}
            onPress={() => openAvatarSourcePicker()}
            className="relative active:opacity-90">
            {uploadingAvatar ? (
              <View className="h-16 w-16 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
                <ActivityIndicator color={BRAND.navy} />
              </View>
            ) : me?.avatar ? (
              <Image source={{ uri: me.avatar }} className="h-16 w-16 rounded-full bg-neutral-200" accessibilityLabel="Profile photo" />
            ) : (
              <View className="h-16 w-16 items-center justify-center rounded-full bg-neutral-200 dark:bg-neutral-700">
                <MaterialIcons name="person" size={36} color="#737373" />
              </View>
            )}
            {user && !uploadingAvatar ? (
              <View
                className="absolute -bottom-0.5 -right-0.5 h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-neutral-800 dark:border-neutral-900 dark:bg-neutral-700"
                pointerEvents="none">
                <MaterialIcons name="photo-camera" size={14} color="#ffffff" />
              </View>
            ) : null}
          </Pressable>
          <View className="min-w-0 flex-1">
            <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{me?.displayName ?? user?.displayName ?? 'Guest'}</Text>
            <Text className="mt-1 text-sm text-neutral-600 dark:text-neutral-400" numberOfLines={2}>
              {me?.email ?? user?.email ?? 'Sign in to sync your profile.'}
            </Text>
          </View>
        </View>
        {me ? (
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
                <Text className="text-xs font-semibold capitalize text-neutral-700 dark:text-neutral-300">{me.role}</Text>
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
        ) : null}
      </View>

      {user ? (
        <>
          <Text className="mb-2 mt-8 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Account</Text>
          <MenuRow icon="place" label="Saved addresses" subtitle="For jobs and visits" onPress={() => router.push('/profile/addresses' as never)} />
          <MenuRow icon="tune" label="Settings" subtitle="Notifications & privacy" onPress={() => router.push('/profile/settings' as never)} />
          <MenuRow icon="account-balance-wallet" label="Wallet" subtitle="Balance, top-up, withdrawals" onPress={() => router.push('/wallet' as never)} />

          <Pressable
            accessibilityRole="button"
            disabled={signingOut}
            onPress={() => void onSignOut()}
            className="mt-8 flex-row items-center justify-center rounded-2xl border-2 border-red-200 bg-white py-4 dark:border-red-900/60 dark:bg-neutral-900">
            {signingOut ? (
              <ActivityIndicator color="#b91c1c" />
            ) : (
              <Text className="text-center text-base font-semibold text-red-700 dark:text-red-400">Sign out</Text>
            )}
          </Pressable>
        </>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/login')}
          style={{ backgroundColor: BRAND.navy }}
          className="mt-8 rounded-2xl py-4 active:opacity-90">
          <Text className="text-center text-base font-semibold text-white">Sign in</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
