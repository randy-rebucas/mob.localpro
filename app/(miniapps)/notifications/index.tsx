import { useQuery } from '@tanstack/react-query';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { BRAND } from '@/constants/brand';
import { notificationService } from '@/core/services/notificationService';
import { getApiErrorMessage } from '@/core/utils/apiError';

export default function NotificationsScreen() {
  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.list(),
  });
  const { data, isPending, isError, isRefetching, refetch, error } = query;

  if (isPending) {
    return (
      <View className="flex-1 gap-3 bg-[#eef2f7] p-4 dark:bg-neutral-950">
        {[1, 2, 3].map((k) => (
          <SkeletonBlock key={k} className="h-16 w-full" />
        ))}
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Text className="text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">Couldn&apos;t load notifications</Text>
        <Text className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
          {getApiErrorMessage(error, 'Pull to refresh or try again.')}
        </Text>
        <Pressable
          onPress={() => void refetch()}
          className="mt-6 self-center rounded-2xl px-6 py-3 active:opacity-90"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  const rows = data ?? [];

  return (
    <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={rows.length === 0 ? { flexGrow: 1 } : undefined}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={BRAND.navy} />
        }
        ListEmptyComponent={
          <FeatureEmptyState
            variant="full"
            icon="notifications-none"
            title="No notifications"
            description="When providers quote your jobs, payments move, or reminders fire, they will show up here."
          />
        }
        renderItem={({ item }) => (
          <View className="mx-4 mb-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{item.title}</Text>
            <Text className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{item.body}</Text>
            <Text className="mt-2 text-xs text-neutral-400">{new Date(item.at).toLocaleString()}</Text>
          </View>
        )}
      />
    </View>
  );
}
