import { useQuery } from '@tanstack/react-query';
import { FlatList, RefreshControl, Text, View } from 'react-native';

import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { notificationService } from '@/core/services/notificationService';

export default function NotificationsScreen() {
  const { data, isPending, isRefetching, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.list(),
  });

  if (isPending) {
    return (
      <View className="flex-1 gap-3 bg-neutral-50 p-4 dark:bg-neutral-950">
        {[1, 2, 3].map((k) => (
          <SkeletonBlock key={k} className="h-16 w-full" />
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
