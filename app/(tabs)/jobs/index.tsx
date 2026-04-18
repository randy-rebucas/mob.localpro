import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { memo, useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { jobService } from '@/core/services/jobService';
import type { Job } from '@/core/types/models';

const JobRow = memo(function JobRow({ item }: { item: Job }) {
  const onPress = useCallback(() => {
    router.push(`/jobs/${item.id}` as never);
  }, [item.id]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Job ${item.title}`}
      onPress={onPress}
      className="mx-4 mb-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{item.title}</Text>
      <Text className="mt-1 text-sm text-neutral-600 dark:text-neutral-400" numberOfLines={2}>
        {item.description}
      </Text>
      <View className="mt-3 flex-row items-center justify-between">
        <Text className="text-xs font-medium uppercase text-brand dark:text-brand-muted">{item.status}</Text>
        {item.locationLabel ? (
          <Text className="text-xs text-neutral-500 dark:text-neutral-500">{item.locationLabel}</Text>
        ) : null}
      </View>
    </Pressable>
  );
});

export default function JobsListScreen() {
  const { data, isPending, isRefetching, refetch } = useQuery({
    queryKey: ['jobs', 'list'],
    queryFn: () => jobService.listJobs(),
  });

  if (isPending) {
    return (
      <View className="flex-1 bg-neutral-50 pt-4 dark:bg-neutral-950">
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

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
        ListHeaderComponent={
          <View className="mb-2 px-4 pt-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Post a new job"
              onPress={() => router.push('/jobs/new' as never)}
              className="rounded-2xl bg-brand py-3 dark:bg-brand-dark">
              <Text className="text-center text-base font-semibold text-white">Post a job</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => <JobRow item={item} />}
        ListEmptyComponent={
          <Text className="mt-10 text-center text-neutral-500">No jobs yet. Post one to get quotes.</Text>
        }
      />
    </View>
  );
}
