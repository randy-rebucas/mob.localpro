import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image } from 'expo-image';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { BRAND } from '@/constants/brand';
import { MiniappHeaderBackButton } from '@/core/navigation/miniappBack';
import { formatProviderAvailability, providerService, type ProviderAvailability } from '@/core/services/providerService';
import { useSessionStore } from '@/core/stores/sessionStore';
import { useToastStore } from '@/core/stores/toastStore';
import { getApiErrorMessage } from '@/core/utils/apiError';

function ProfileAvailabilityBadge({ status }: { status: ProviderAvailability }) {
  const label = formatProviderAvailability(status);
  const style =
    status === 'available'
      ? 'bg-emerald-100 dark:bg-emerald-900/40'
      : status === 'busy'
        ? 'bg-amber-100 dark:bg-amber-900/40'
        : 'bg-neutral-200 dark:bg-neutral-700';
  const textStyle =
    status === 'available'
      ? 'text-emerald-800 dark:text-emerald-200'
      : status === 'busy'
        ? 'text-amber-900 dark:text-amber-100'
        : 'text-neutral-700 dark:text-neutral-200';
  return (
    <View className={`rounded-full px-2.5 py-1 ${style}`}>
      <Text className={`text-xs font-bold uppercase tracking-wide ${textStyle}`}>{label}</Text>
    </View>
  );
}

export default function ProviderProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const providerId = typeof id === 'string' ? id : id?.[0] ?? '';
  const user = useSessionStore((s) => s.user);
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);

  const profileQuery = useQuery({
    queryKey: ['providers', 'profile', providerId],
    queryFn: () => providerService.getProfile(providerId),
    enabled: !!user && !!providerId,
  });

  const reviewsQuery = useQuery({
    queryKey: ['providers', 'reviews', providerId],
    queryFn: () => providerService.listReviews(providerId),
    enabled: !!user && !!providerId,
  });

  const favQuery = useQuery({
    queryKey: ['favorites', 'ids'],
    queryFn: () => providerService.listFavoriteIds(),
    enabled: !!user,
  });

  const isFavorite = favQuery.data?.has(providerId) ?? false;

  const favMutation = useMutation({
    mutationFn: async () => {
      if (isFavorite) {
        await providerService.removeFavorite(providerId);
      } else {
        await providerService.addFavorite(providerId);
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['favorites'] });
      await qc.invalidateQueries({ queryKey: ['providers'] });
      showToast(isFavorite ? 'Removed from favorites' : 'Saved to favorites');
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Could not update favorites'), 'error'),
  });

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Stack.Screen
          options={{ title: 'Provider', headerLeft: () => <MiniappHeaderBackButton /> }}
        />
        <Text className="text-center text-base text-neutral-700 dark:text-neutral-300">Sign in to view this profile.</Text>
        <Pressable
          onPress={() => router.push('/login')}
          className="mt-6 rounded-2xl px-6 py-3 active:opacity-90"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">Sign in</Text>
        </Pressable>
      </View>
    );
  }

  if (!providerId) {
    return (
      <View className="flex-1 items-center justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Stack.Screen
          options={{ title: 'Provider', headerLeft: () => <MiniappHeaderBackButton /> }}
        />
        <Text className="text-center text-neutral-600 dark:text-neutral-400">Missing provider.</Text>
      </View>
    );
  }

  if (profileQuery.isPending) {
    return (
      <View className="flex-1 gap-3 bg-[#eef2f7] p-4 dark:bg-neutral-950">
        <Stack.Screen
          options={{ title: 'Provider', headerLeft: () => <MiniappHeaderBackButton /> }}
        />
        <SkeletonBlock className="h-10 w-2/3" />
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-32 w-full" />
      </View>
    );
  }

  if (profileQuery.isError) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Stack.Screen
          options={{ title: 'Provider', headerLeft: () => <MiniappHeaderBackButton /> }}
        />
        <MaterialIcons name="cloud-off" size={40} color="#737373" style={{ alignSelf: 'center' }} />
        <Text className="mt-4 text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">
          Couldn&apos;t load profile
        </Text>
        <Text className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
          {getApiErrorMessage(profileQuery.error, 'Try again in a moment.')}
        </Text>
        <Pressable
          onPress={() => void profileQuery.refetch()}
          className="mt-6 self-center rounded-2xl px-6 py-3 active:opacity-90"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  const p = profileQuery.data;
  const title = p.displayName;

  return (
    <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
      <Stack.Screen
        options={{
          title,
          headerLeft: () => <MiniappHeaderBackButton />,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white px-4 pb-5 pt-4 dark:border-neutral-800 dark:bg-neutral-900">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            disabled={favMutation.isPending}
            onPress={() => favMutation.mutate()}
            className="absolute right-3 top-3 z-10 rounded-full border border-neutral-200 bg-white p-2.5 active:opacity-90 dark:border-neutral-700 dark:bg-neutral-950">
            <MaterialIcons name={isFavorite ? 'favorite' : 'favorite-border'} size={24} color={BRAND.navy} />
          </Pressable>
          <View className="items-center pt-1">
            <View className="h-24 w-24 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
              {p.avatarUrl ? (
                <Image
                  source={{ uri: p.avatarUrl }}
                  style={{ width: 96, height: 96 }}
                  contentFit="cover"
                  transition={200}
                  accessibilityLabel={`${p.displayName} profile photo`}
                />
              ) : (
                <View className="h-24 w-24 items-center justify-center">
                  <MaterialIcons name="person" size={48} color="#737373" />
                </View>
              )}
            </View>
            <Text className="mt-3 text-center text-2xl font-bold text-neutral-900 dark:text-neutral-50">
              {p.displayName}
            </Text>
            <View className="mt-2 flex-row flex-wrap items-center justify-center gap-2">
              {p.avgRating > 0 ? (
                <View className="flex-row items-center rounded-full bg-amber-50 px-3 py-1 dark:bg-amber-900/35">
                  <MaterialIcons name="star" size={18} color="#d97706" />
                  <Text className="ml-1 text-base font-bold text-neutral-900 dark:text-neutral-50">
                    {p.avgRating.toFixed(1)}
                  </Text>
                  <Text className="ml-1 text-sm text-neutral-600 dark:text-neutral-400">average</Text>
                </View>
              ) : (
                <Text className="text-sm text-neutral-500 dark:text-neutral-400">No ratings yet</Text>
              )}
              {p.reviewCount != null && p.reviewCount > 0 ? (
                <Text className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                  {p.reviewCount} review{p.reviewCount === 1 ? '' : 's'}
                </Text>
              ) : null}
              {p.availability ? <ProfileAvailabilityBadge status={p.availability} /> : null}
            </View>
            <Text className="mt-3 text-center text-sm text-neutral-500 dark:text-neutral-400">
              {p.completedJobCount} job{p.completedJobCount === 1 ? '' : 's'} completed
              {typeof p.streak === 'number' ? ` · ${p.streak}★ review streak` : ''}
            </Text>
            {p.category != null && p.category.length > 0 ? (
              <Text className="mt-2 text-center text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                {p.category.replace(/_/g, ' ')}
              </Text>
            ) : null}
            {p.subcategories != null && p.subcategories.length > 0 ? (
              <View className="mt-2 flex-row flex-wrap justify-center gap-1.5 px-2">
                {p.subcategories.map((sub) => (
                  <View
                    key={sub}
                    className="rounded-full border border-neutral-200 bg-[#eef2f7] px-2 py-0.5 dark:border-neutral-600 dark:bg-neutral-800">
                    <Text className="text-[10px] font-medium text-neutral-700 dark:text-neutral-300">
                      {sub.replace(/_/g, ' ')}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            {p.hourlyRate != null ? (
              <View className="mt-3 flex-row flex-wrap items-center justify-center gap-3">
                <Text className="text-base font-bold text-[#007AFF]">₱{p.hourlyRate}/hr</Text>
              </View>
            ) : null}
            {p.responseRatePercent != null || p.avgResponseTimeMinutes != null || p.acceptanceRatePercent != null ? (
              <View className="mt-3 flex-row flex-wrap justify-center gap-x-4 gap-y-1 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                {p.responseRatePercent != null ? (
                  <Text className="text-center text-[11px] text-neutral-500 dark:text-neutral-400">
                    {p.responseRatePercent}% response rate
                  </Text>
                ) : null}
                {p.avgResponseTimeMinutes != null ? (
                  <Text className="text-center text-[11px] text-neutral-500 dark:text-neutral-400">
                    ~{p.avgResponseTimeMinutes} min reply
                  </Text>
                ) : null}
                {p.acceptanceRatePercent != null ? (
                  <Text className="text-center text-[11px] text-neutral-500 dark:text-neutral-400">
                    {p.acceptanceRatePercent}% jobs accepted
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        {p.bio ? (
          <View className="mt-5 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Bio</Text>
            <Text className="mt-2 text-sm leading-6 text-neutral-800 dark:text-neutral-200">{p.bio}</Text>
          </View>
        ) : null}

        {p.skills.length > 0 ? (
          <View className="mt-5">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Skills
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {p.skills.map((s, i) => (
                <View
                  key={`${s.skill}-${i}`}
                  className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-900">
                  <Text className="text-xs font-medium text-neutral-800 dark:text-neutral-200">{s.skill}</Text>
                  {s.hourlyRate != null && s.hourlyRate.length > 0 ? (
                    <Text className="text-[10px] font-semibold text-[#007AFF]">₱{s.hourlyRate}/hr</Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {p.breakdown && Object.keys(p.breakdown).length > 0 ? (
          <View className="mt-5 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Rating breakdown
            </Text>
            <View className="mt-3 gap-2">
              {Object.entries(p.breakdown).map(([k, v]) => (
                <View key={k} className="flex-row items-center justify-between">
                  <Text className="text-sm capitalize text-neutral-700 dark:text-neutral-300">{k}</Text>
                  <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">
                    {Number.isFinite(Number(v)) ? Number(v).toFixed(1) : '—'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <Text className="mb-2 mt-8 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Reviews
        </Text>
        {reviewsQuery.isPending ? (
          <SkeletonBlock className="h-20 w-full" />
        ) : reviewsQuery.isError ? (
          <Text className="text-sm text-neutral-600 dark:text-neutral-400">
            {getApiErrorMessage(reviewsQuery.error, 'Reviews unavailable.')}
          </Text>
        ) : (reviewsQuery.data ?? []).length === 0 ? (
          <Text className="text-sm text-neutral-600 dark:text-neutral-400">No reviews yet.</Text>
        ) : (
          <View className="gap-2">
            {(reviewsQuery.data ?? []).map((r) => (
              <View
                key={r.id}
                className="rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
                <View className="flex-row items-center justify-between">
                  {r.authorLabel ? (
                    <Text className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{r.authorLabel}</Text>
                  ) : null}
                  {r.rating != null ? (
                    <Text className="text-xs font-semibold text-amber-700 dark:text-amber-400">{r.rating}★</Text>
                  ) : null}
                </View>
                {r.title ? (
                  <Text className="mt-1 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{r.title}</Text>
                ) : null}
                <Text className="mt-1 text-sm leading-5 text-neutral-800 dark:text-neutral-200">{r.body}</Text>
                <Text className="mt-1 text-[10px] text-neutral-400">
                  {new Date(r.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
