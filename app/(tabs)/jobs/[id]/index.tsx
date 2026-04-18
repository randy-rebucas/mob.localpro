import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { jobService } from '@/core/services/jobService';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const jobId = typeof id === 'string' ? id : id?.[0] ?? '';

  const { data: job, isPending } = useQuery({
    queryKey: ['jobs', 'detail', jobId],
    queryFn: () => jobService.getJob(jobId),
    enabled: !!jobId,
  });

  if (isPending || !job) {
    return (
      <View className="flex-1 gap-3 bg-neutral-50 p-4 dark:bg-neutral-950">
        <SkeletonBlock className="h-8 w-11/12" />
        <SkeletonBlock className="h-24 w-full" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50 p-4 dark:bg-neutral-950">
      <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{job.title}</Text>
      <Text className="mt-2 text-base leading-6 text-neutral-700 dark:text-neutral-300">{job.description}</Text>
      <View className="mt-4 flex-row flex-wrap gap-2">
        <Text className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-semibold uppercase text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
          {job.status}
        </Text>
        {job.locationLabel ? (
          <Text className="rounded-full bg-brand-muted/40 px-3 py-1 text-xs font-medium text-brand-dark dark:text-brand-muted">
            {job.locationLabel}
          </Text>
        ) : null}
      </View>

      <View className="mt-10 gap-3">
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/jobs/${job.id}/quotes` as never)}
          className="rounded-2xl border border-neutral-200 bg-white py-4 dark:border-neutral-800 dark:bg-neutral-900">
          <Text className="text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">View quotes</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/jobs/${job.id}/chat` as never)}
          className="rounded-2xl border border-neutral-200 bg-white py-4 dark:border-neutral-800 dark:bg-neutral-900">
          <Text className="text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">Open job chat</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/jobs/${job.id}/review` as never)}
          className="rounded-2xl bg-brand py-4 dark:bg-brand-dark">
          <Text className="text-center text-base font-semibold text-white">Leave review</Text>
        </Pressable>
      </View>
    </View>
  );
}
