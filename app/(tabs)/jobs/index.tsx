import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { BRAND } from '@/constants/brand';
import { categoryService } from '@/core/services/categoryService';
import { jobService } from '@/core/services/jobService';
import { useSessionStore } from '@/core/stores/sessionStore';
import { formatPeso } from '@/core/utils/money';
import { getApiErrorMessage } from '@/core/utils/apiError';
import type { Job } from '@/core/types/models';

const STATUS_FILTERS: { key: string; label: string; api?: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open', api: 'open' },
  { key: 'quoted', label: 'Quoted', api: 'quoted' },
  { key: 'active', label: 'Active', api: 'in_progress' },
  { key: 'done', label: 'Done', api: 'completed' },
];

function formatJobBudget(job: Job): string | null {
  const min = job.budgetMin;
  const max = job.budgetMax;
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) {
    return `${formatPeso(min)} – ${formatPeso(max)}`;
  }
  return formatPeso(min ?? max ?? 0);
}

const JobRow = memo(function JobRow({ item }: { item: Job }) {
  const onPress = useCallback(() => {
    router.push(`/jobs/${item.id}` as never);
  }, [item.id]);

  const budget = formatJobBudget(item);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Job ${item.title}, status ${item.status}`}
      onPress={onPress}
      className="mx-4 mb-3 rounded-2xl border border-neutral-200 bg-white p-4 active:opacity-95 dark:border-neutral-800 dark:bg-neutral-900">
      <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{item.title}</Text>
      <Text className="mt-1 text-sm text-neutral-600 dark:text-neutral-400" numberOfLines={2}>
        {item.description}
      </Text>
      <View className="mt-3 flex-row flex-wrap items-center gap-2">
        <Text className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold uppercase text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          {item.status.replace(/_/g, ' ')}
        </Text>
        {budget ? (
          <Text style={{ color: BRAND.navy }} className="text-xs font-semibold dark:text-sky-300">
            {budget}
          </Text>
        ) : null}
        {item.locationLabel ? (
          <Text className="text-xs text-neutral-500 dark:text-neutral-500">{item.locationLabel}</Text>
        ) : null}
      </View>
    </Pressable>
  );
});

function StatusFilterChips({ filterKey, onChange }: { filterKey: string; onChange: (k: string) => void }) {
  return (
    <View className="mt-4 flex-row flex-wrap gap-2">
      {STATUS_FILTERS.map((f) => {
        const active = f.key === filterKey;
        return (
          <Pressable
            key={f.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Filter ${f.label}`}
            onPress={() => onChange(f.key)}
            className={`rounded-full px-3.5 py-1.5 ${active ? '' : 'bg-neutral-200 dark:bg-neutral-800'}`}
            style={active ? { backgroundColor: BRAND.navy } : undefined}>
            <Text
              className={`text-xs font-semibold ${active ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
              {f.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CategoryFilterChips({
  categories,
  selectedId,
  onSelect,
}: {
  categories: { id: string; name: string }[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View className="mt-5">
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Category
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="flex-row gap-2 pr-2">
        <Pressable
          onPress={() => onSelect('')}
          className={`rounded-full px-3.5 py-1.5 ${selectedId === '' ? '' : 'bg-neutral-200 dark:bg-neutral-800'}`}
          style={selectedId === '' ? { backgroundColor: BRAND.green } : undefined}>
          <Text className={`text-xs font-semibold ${selectedId === '' ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
            All types
          </Text>
        </Pressable>
        {categories.map((c) => {
          const active = c.id === selectedId;
          return (
            <Pressable
              key={c.id}
              onPress={() => onSelect(c.id)}
              className={`max-w-[200px] rounded-full px-3.5 py-1.5 ${active ? '' : 'bg-neutral-200 dark:bg-neutral-800'}`}
              style={active ? { backgroundColor: BRAND.green } : undefined}>
              <Text
                numberOfLines={1}
                className={`text-xs font-semibold ${active ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
                {c.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function JobsListScreen() {
  const user = useSessionStore((s) => s.user);
  const [filterKey, setFilterKey] = useState('all');
  const [categoryId, setCategoryId] = useState('');
  const statusParam = useMemo(() => STATUS_FILTERS.find((f) => f.key === filterKey)?.api, [filterKey]);

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'list'],
    queryFn: () => categoryService.list(),
    staleTime: 86_400_000,
  });

  const query = useInfiniteQuery({
    queryKey: ['jobs', 'list', { status: statusParam ?? 'all', category: categoryId || 'all' }],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      jobService.listJobs({
        page: pageParam as number,
        limit: 12,
        ...(statusParam ? { status: statusParam } : {}),
        ...(categoryId ? { category: categoryId } : {}),
      }),
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });

  const jobs = useMemo(() => query.data?.pages.flatMap((p) => p.jobs) ?? [], [query.data?.pages]);
  const isInitialLoading = query.isPending;
  const refreshing = query.isRefetching && !query.isFetchingNextPage;

  const onEndReached = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [query]);

  if (isInitialLoading) {
    return (
      <View className="flex-1 bg-[#eef2f7] pt-4 dark:bg-neutral-950">
        {[1, 2, 3, 4].map((k) => (
          <View key={k} className="mx-4 mb-3 gap-2">
            <SkeletonBlock className="h-5 w-4/5" />
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-11/12" />
          </View>
        ))}
      </View>
    );
  }

  if (query.isError) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <MaterialIcons name="cloud-off" size={40} color="#737373" style={{ alignSelf: 'center' }} />
        <Text className="mt-4 text-center text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Couldn&apos;t load jobs
        </Text>
        <Text className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
          {getApiErrorMessage(query.error)}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Retry loading jobs"
          onPress={() => void query.refetch()}
          className="mt-6 self-center rounded-2xl px-6 py-3 active:opacity-90"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">Try again</Text>
        </Pressable>
      </View>
    );
  }

  const categories = categoriesQuery.data ?? [];
  const hasFilters = filterKey !== 'all' || !!categoryId;

  return (
    <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={jobs.length === 0 ? { flexGrow: 1 } : undefined}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void query.refetch()} tintColor={BRAND.navy} />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.35}
        ListHeaderComponent={
          <View className="mb-3 px-4 pt-3">
            {!user ? (
              <Pressable
                onPress={() => router.push('/login')}
                className="mb-4 rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
                <Text className="text-center text-sm text-neutral-700 dark:text-neutral-300">
                  <Text className="font-semibold text-neutral-900 dark:text-neutral-100">Sign in</Text> to post jobs and
                  see your full history.
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Post a new job"
              onPress={() => router.push('/jobs/new' as never)}
              className="rounded-2xl py-3.5 active:opacity-90"
              style={{ backgroundColor: BRAND.navy }}>
              <Text className="text-center text-base font-semibold text-white">Post a job</Text>
            </Pressable>
            <StatusFilterChips filterKey={filterKey} onChange={setFilterKey} />
            {categories.length > 0 ? (
              <CategoryFilterChips categories={categories} selectedId={categoryId} onSelect={setCategoryId} />
            ) : null}
          </View>
        }
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <View className="py-4">
              <ActivityIndicator color={BRAND.navy} />
            </View>
          ) : null
        }
        renderItem={({ item }) => <JobRow item={item} />}
        ListEmptyComponent={
          <FeatureEmptyState
            variant="full"
            icon="work-off"
            title={hasFilters ? 'No jobs match these filters' : 'No jobs to show'}
            description={
              hasFilters
                ? 'Try another status or category, reset filters to see everything, or post a new job to the marketplace.'
                : 'Nothing is listed in this view right now. Post a job or check back soon.'
            }
            primaryAction={{
              label: 'Post a job',
              onPress: () => router.push('/jobs/new' as never),
              accessibilityLabel: 'Post a new job',
            }}
            secondaryAction={
              hasFilters
                ? {
                    label: 'Reset filters',
                    onPress: () => {
                      setFilterKey('all');
                      setCategoryId('');
                    },
                    accessibilityLabel: 'Reset job filters',
                  }
                : undefined
            }
          />
        }
      />
    </View>
  );
}
