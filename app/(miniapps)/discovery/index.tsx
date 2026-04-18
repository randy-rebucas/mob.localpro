import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, router } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { BRAND } from '@/constants/brand';
import { MiniappHeaderBackButton } from '@/core/navigation/miniappBack';
import {
  formatProviderAvailability,
  providerService,
  type ProviderAvailability,
  type ProviderListItem,
} from '@/core/services/providerService';
import { useSessionStore } from '@/core/stores/sessionStore';
import { getApiErrorMessage } from '@/core/utils/apiError';

type AvailabilityFilter = 'all' | 'available' | 'busy' | 'unavailable';

function ListAvailabilityBadge({ status }: { status: ProviderAvailability }) {
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
    <View className={`rounded-full px-2 py-0.5 ${style}`} accessibilityLabel={label}>
      <Text className={`text-[10px] font-bold uppercase tracking-wide ${textStyle}`}>{label}</Text>
    </View>
  );
}

const Row = memo(function Row({ item }: { item: ProviderListItem }) {
  const go = useCallback(() => {
    router.push(`/discovery/providers/${encodeURIComponent(item.id)}` as never);
  }, [item.id]);

  const a11y = [
    item.displayName,
    item.city ? item.city : null,
    item.availability ? formatProviderAvailability(item.availability) : null,
    item.avgRating != null && item.avgRating > 0 ? `${item.avgRating.toFixed(1)} stars` : null,
    item.skills.length ? `Skills: ${item.skills.join(', ')}` : null,
    item.hourlyRate != null ? `${item.hourlyRate} pesos per hour` : null,
    item.subtitle ?? null,
  ]
    .filter(Boolean)
    .join('. ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={go}
      className="mx-4 mb-3 rounded-2xl border border-neutral-200 bg-white p-4 active:opacity-95 dark:border-neutral-800 dark:bg-neutral-900">
      <View className="flex-row gap-3">
        <View className="h-16 w-16 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
          {item.avatarUrl ? (
            <Image
              source={{ uri: item.avatarUrl }}
              style={{ width: 64, height: 64 }}
              contentFit="cover"
              transition={200}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View className="h-16 w-16 items-center justify-center" accessibilityLabel="No photo">
              <MaterialIcons name="person" size={34} color="#737373" />
            </View>
          )}
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-start justify-between gap-2">
            <Text className="flex-1 text-base font-semibold text-neutral-900 dark:text-neutral-50" numberOfLines={2}>
              {item.displayName}
            </Text>
            {item.isFavorite ? (
              <MaterialIcons name="favorite" size={20} color={BRAND.navy} accessibilityLabel="Favorite" />
            ) : null}
          </View>
          <View className="mt-1.5 flex-row flex-wrap items-center gap-2">
            {item.avgRating != null && item.avgRating > 0 ? (
              <View className="flex-row items-center rounded-full bg-amber-50 px-2 py-0.5 dark:bg-amber-900/30">
                <MaterialIcons name="star" size={14} color="#d97706" />
                <Text className="ml-0.5 text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  {item.avgRating.toFixed(1)}
                </Text>
                {item.reviewCount != null && item.reviewCount > 0 ? (
                  <Text className="ml-1 text-xs text-neutral-600 dark:text-neutral-400">({item.reviewCount})</Text>
                ) : null}
              </View>
            ) : null}
            {item.availability ? <ListAvailabilityBadge status={item.availability} /> : null}
          </View>
          {item.skills.length > 0 ? (
            <View className="mt-2 flex-row flex-wrap gap-1.5">
              {item.skills.map((s, i) => (
                <View
                  key={`${s}-${i}`}
                  className="rounded-full border border-neutral-200 bg-[#eef2f7] px-2 py-0.5 dark:border-neutral-600 dark:bg-neutral-800">
                  <Text className="text-[11px] font-medium text-neutral-800 dark:text-neutral-200">{s}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {item.subtitle ? (
            <Text className="mt-2 text-sm leading-5 text-neutral-600 dark:text-neutral-400" numberOfLines={2}>
              {item.subtitle}
            </Text>
          ) : null}
          {(item.city != null && item.city.length > 0) ||
          (item.category != null && item.category.length > 0) ||
          item.hourlyRate != null ||
          item.distanceKm != null ? (
            <View className="mt-3 flex-row flex-wrap items-center gap-x-3 gap-y-1 border-t border-neutral-100 pt-3 dark:border-neutral-800">
              {item.category ? (
                <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  {item.category.replace(/_/g, ' ')}
                </Text>
              ) : null}
              {item.city ? (
                <View className="flex-row items-center gap-1">
                  <MaterialIcons name="place" size={14} color="#737373" />
                  <Text className="text-xs font-medium text-neutral-600 dark:text-neutral-400" numberOfLines={1}>
                    {item.city}
                  </Text>
                </View>
              ) : null}
              {item.distanceKm != null ? (
                <Text className="text-xs text-neutral-500 dark:text-neutral-400">{item.distanceKm.toFixed(1)} km</Text>
              ) : null}
              {item.hourlyRate != null ? (
                <Text className="text-xs font-bold text-[#007AFF]">₱{item.hourlyRate}/hr</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

function AvailabilityChip({
  label,
  value,
  selected,
  onSelect,
}: {
  label: string;
  value: AvailabilityFilter;
  selected: AvailabilityFilter;
  onSelect: (v: AvailabilityFilter) => void;
}) {
  const active = selected === value;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={() => onSelect(value)}
      className={`mr-2 rounded-full border px-3 py-1.5 ${
        active ? 'border-transparent' : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'
      }`}
      style={active ? { backgroundColor: BRAND.navy } : undefined}>
      <Text className={`text-xs font-semibold ${active ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function DiscoveryIndexScreen() {
  const user = useSessionStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [availability, setAvailability] = useState<AvailabilityFilter>('all');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const listParams = useMemo(
    () => ({
      search: debouncedSearch.length >= 2 ? debouncedSearch : undefined,
      availability: availability === 'all' ? undefined : availability,
    }),
    [availability, debouncedSearch]
  );

  const providersQuery = useQuery({
    queryKey: ['providers', 'list', listParams.search ?? '', listParams.availability ?? ''],
    queryFn: () => providerService.list(listParams),
    enabled: !!user,
    staleTime: 30_000,
  });

  if (!user) {
    return (
      <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
        <Stack.Screen
          options={{
            title: 'Find providers',
            headerLeft: () => <MiniappHeaderBackButton />,
          }}
        />
        <FeatureEmptyState
          variant="full"
          icon="travel-explore"
          title="Sign in to browse providers"
          description="Search approved providers, filter by availability, and open profiles after you sign in."
          primaryAction={{
            label: 'Sign in',
            onPress: () => router.push('/login'),
            accessibilityLabel: 'Sign in to find providers',
          }}
        />
      </View>
    );
  }

  if (providersQuery.isPending) {
    return (
      <View className="flex-1 gap-3 bg-[#eef2f7] p-4 dark:bg-neutral-950">
        <Stack.Screen
          options={{
            title: 'Find providers',
            headerLeft: () => <MiniappHeaderBackButton />,
          }}
        />
        <SkeletonBlock className="h-12 w-full" />
        {[1, 2, 3, 4].map((k) => (
          <SkeletonBlock key={k} className="h-20 w-full" />
        ))}
      </View>
    );
  }

  if (providersQuery.isError) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Stack.Screen
          options={{
            title: 'Find providers',
            headerLeft: () => <MiniappHeaderBackButton />,
          }}
        />
        <MaterialIcons name="cloud-off" size={40} color="#737373" style={{ alignSelf: 'center' }} />
        <Text className="mt-4 text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">
          Couldn&apos;t load providers
        </Text>
        <Text className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
          {getApiErrorMessage(providersQuery.error, 'Pull to refresh or try again.')}
        </Text>
        <Pressable
          onPress={() => void providersQuery.refetch()}
          className="mt-6 self-center rounded-2xl px-6 py-3 active:opacity-90"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  const rows = providersQuery.data ?? [];

  return (
    <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
      <Stack.Screen
        options={{
          title: 'Find providers',
          headerLeft: () => <MiniappHeaderBackButton />,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open map"
              hitSlop={12}
              onPress={() => router.push('/discovery/map' as never)}
              className="mr-1 rounded-full p-2 active:opacity-70">
              <MaterialIcons name="map" size={24} color={BRAND.navy} />
            </Pressable>
          ),
        }}
      />
      <View className="border-b border-neutral-200 bg-white px-4 pb-3 pt-2 dark:border-neutral-800 dark:bg-neutral-900">
        <View className="flex-row items-center rounded-xl border border-neutral-200 bg-[#eef2f7] px-3 dark:border-neutral-700 dark:bg-neutral-950">
          <MaterialIcons name="search" size={22} color="#737373" />
          <TextInput
            accessibilityLabel="Search providers"
            className="ml-2 min-h-[44px] flex-1 py-2 text-base text-neutral-900 dark:text-neutral-100"
            placeholder="Search by name or skill (min 2 characters)"
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
        </View>
        <View className="mt-3 flex-row flex-wrap">
          <AvailabilityChip label="All" value="all" selected={availability} onSelect={setAvailability} />
          <AvailabilityChip label="Available" value="available" selected={availability} onSelect={setAvailability} />
          <AvailabilityChip label="Busy" value="busy" selected={availability} onSelect={setAvailability} />
          <AvailabilityChip
            label="Unavailable"
            value="unavailable"
            selected={availability}
            onSelect={setAvailability}
          />
        </View>
        <Text className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          Type at least two characters to narrow results; otherwise the full list loads with your availability filter.
        </Text>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          rows.length === 0 ? { flexGrow: 1, paddingTop: 8, paddingBottom: 24 } : { paddingTop: 8, paddingBottom: 24 }
        }
        refreshControl={
          <RefreshControl
            refreshing={providersQuery.isRefetching}
            onRefresh={() => void providersQuery.refetch()}
            tintColor={BRAND.navy}
          />
        }
        renderItem={({ item }) => <Row item={item} />}
        ListEmptyComponent={
          <FeatureEmptyState
            variant="full"
            icon="person-search"
            title="No providers found"
            description="Try another search or availability filter. New providers appear here once approved."
          />
        }
      />
    </View>
  );
}
