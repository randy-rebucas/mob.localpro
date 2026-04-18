import { useQuery } from '@tanstack/react-query';
import { FlatList, RefreshControl, Text, View } from 'react-native';

import { SkeletonBlock } from '@/components/ui/SkeletonBlock';

type NotificationRow = { id: string; title: string; body: string; at: string };

async function fetchNotifications(): Promise<NotificationRow[]> {
  return [
    { id: 'n1', title: 'New quote', body: 'Spark Electric sent a quote.', at: new Date().toISOString() },
    { id: 'n2', title: 'Escrow funded', body: '₱3,200 held for your job.', at: new Date().toISOString() },
  ];
}

export default function NotificationsScreen() {
  const { data, isPending, isRefetching, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
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
          </View>
        )}
      />
    </View>
  );
}
