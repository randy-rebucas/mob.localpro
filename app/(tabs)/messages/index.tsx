import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { memo, useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { messageService, type ThreadSummary } from '@/core/services/messageService';

const Row = memo(function Row({ item }: { item: ThreadSummary }) {
  const go = useCallback(() => {
    router.push(`/messages/${item.id}` as never);
  }, [item.id]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Thread ${item.title}`}
      onPress={go}
      className="mx-4 mb-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{item.title}</Text>
      <Text className="mt-1 text-sm text-neutral-600 dark:text-neutral-400" numberOfLines={2}>
        {item.lastMessagePreview}
      </Text>
    </Pressable>
  );
});

export default function MessagesListScreen() {
  const { data, isPending, isRefetching, refetch } = useQuery({
    queryKey: ['messages', 'threads'],
    queryFn: () => messageService.listThreads(),
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
        keyExtractor={(t) => t.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} />}
        renderItem={({ item }) => <Row item={item} />}
        ListEmptyComponent={<Text className="mt-10 text-center text-neutral-500">No conversations yet.</Text>}
      />
    </View>
  );
}
