import { useQuery } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { memo, useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { BRAND } from '@/constants/brand';
import { messageService, type ThreadSummary } from '@/core/services/messageService';
import { useSessionStore } from '@/core/stores/sessionStore';
import { getApiErrorMessage } from '@/core/utils/apiError';

const Row = memo(function Row({ item }: { item: ThreadSummary }) {
  const go = useCallback(() => {
    const q = `title=${encodeURIComponent(item.title)}`;
    router.push(`/messages/${item.id}?${q}` as never);
  }, [item.id, item.title]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Thread ${item.title}`}
      onPress={go}
      className="mx-4 mb-3 rounded-2xl border border-neutral-200 bg-white p-4 active:opacity-95 dark:border-neutral-800 dark:bg-neutral-900">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{item.title}</Text>
          {item.otherPartyName ? (
            <Text className="mt-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">with {item.otherPartyName}</Text>
          ) : null}
          <Text className="mt-2 text-sm leading-5 text-neutral-600 dark:text-neutral-400" numberOfLines={2}>
            {item.lastMessagePreview || 'No messages yet'}
          </Text>
        </View>
        {item.unreadCount > 0 ? (
          <View
            style={{ backgroundColor: BRAND.navy }}
            className="min-w-[26px] items-center justify-center rounded-full px-2 py-1">
            <Text className="text-xs font-bold text-white">{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
          </View>
        ) : null}
      </View>
      <Text className="mt-2 text-[11px] text-neutral-400 dark:text-neutral-500">
        {new Date(item.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
      </Text>
    </Pressable>
  );
});

export default function MessagesListScreen() {
  const user = useSessionStore((s) => s.user);

  const threadsQuery = useQuery({
    queryKey: ['messages', 'threads'],
    queryFn: () => messageService.listThreads(),
    enabled: !!user,
    staleTime: 60_000,
  });

  const unreadQuery = useQuery({
    queryKey: ['messages', 'unread'],
    queryFn: () => messageService.getUnreadCount(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const unread = unreadQuery.data ?? 0;

  if (!user) {
    return (
      <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
        <Stack.Screen options={{ title: 'Messages' }} />
        <View className="px-4 pt-3">
          <Pressable
            onPress={() => router.push('/login')}
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 active:opacity-95 dark:border-neutral-800 dark:bg-neutral-900">
            <Text className="text-center text-sm leading-5 text-neutral-700 dark:text-neutral-300">
              <Text className="font-semibold text-neutral-900 dark:text-neutral-100">Sign in</Text> to see job chats and
              message providers.
            </Text>
          </Pressable>
        </View>
        <View className="flex-1 items-center justify-center px-8 pb-16">
          <Text className="text-center text-sm text-neutral-500 dark:text-neutral-400">
            Conversations appear here after you start chat from a job.
          </Text>
        </View>
      </View>
    );
  }

  if (threadsQuery.isPending) {
    return (
      <View className="flex-1 gap-3 bg-[#eef2f7] p-4 dark:bg-neutral-950">
        <Stack.Screen options={{ title: 'Messages' }} />
        {[1, 2, 3].map((k) => (
          <SkeletonBlock key={k} className="h-16 w-full" />
        ))}
      </View>
    );
  }

  if (threadsQuery.isError) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Stack.Screen options={{ title: 'Messages' }} />
        <Text className="text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">Couldn&apos;t load conversations</Text>
        <Text className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
          {getApiErrorMessage(threadsQuery.error, 'Pull to refresh or try again later.')}
        </Text>
        <Pressable
          onPress={() => void threadsQuery.refetch()}
          className="mt-6 self-center rounded-2xl px-6 py-3 active:opacity-90"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
      <Stack.Screen
        options={{
          title: unread > 0 ? `Messages (${unread > 99 ? '99+' : unread})` : 'Messages',
        }}
      />
      <FlatList
        data={threadsQuery.data ?? []}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={threadsQuery.isRefetching || unreadQuery.isRefetching}
            onRefresh={() => {
              void threadsQuery.refetch();
              void unreadQuery.refetch();
            }}
            tintColor={BRAND.navy}
          />
        }
        renderItem={({ item }) => <Row item={item} />}
        ListEmptyComponent={
          <Text className="mt-10 px-6 text-center text-sm leading-6 text-neutral-500 dark:text-neutral-400">
            No conversations yet. Open a job and tap Chat to message your provider.
          </Text>
        }
      />
    </View>
  );
}
