import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Pressable, Text, View } from 'react-native';

import { ChatThreadView } from '@/components/messages/ChatThreadView';
import { BRAND } from '@/constants/brand';
import { useThreadMessageStream } from '@/core/realtime/useThreadMessageStream';
import { messageService } from '@/core/services/messageService';
import { useSessionStore } from '@/core/stores/sessionStore';

function decodeTitleParam(raw: string | string[] | undefined): string | undefined {
  const v = typeof raw === 'string' ? raw : raw?.[0];
  if (!v) return undefined;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

export default function MessagesThreadScreen() {
  const user = useSessionStore((s) => s.user);
  const { threadId, title: titleParam } = useLocalSearchParams<{ threadId: string; title?: string }>();
  const tid = typeof threadId === 'string' ? threadId : threadId?.[0] ?? '';
  const titleFromRoute = decodeTitleParam(titleParam);
  const needsThreadListForTitle = !titleFromRoute;

  const threadsQuery = useQuery({
    queryKey: ['messages', 'threads'],
    queryFn: () => messageService.listThreads(),
    enabled: !!user && !!tid && needsThreadListForTitle,
    staleTime: 60_000,
  });

  const title = useMemo(() => {
    if (titleFromRoute) return titleFromRoute;
    const rows = threadsQuery.data ?? [];
    const hit = rows.find((t) => t.id === tid);
    return hit?.title ?? 'Chat';
  }, [threadsQuery.data, tid, titleFromRoute]);

  useThreadMessageStream(user && tid ? tid : undefined);

  if (!user) {
    return (
      <>
        <Stack.Screen options={{ title: 'Chat' }} />
        <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
          <Text className="text-center text-base text-neutral-700 dark:text-neutral-300">
            Sign in to open this conversation.
          </Text>
          <Pressable
            onPress={() => router.push('/login')}
            className="mt-6 self-center rounded-2xl px-6 py-3 active:opacity-90"
            style={{ backgroundColor: BRAND.navy }}>
            <Text className="font-semibold text-white">Sign in</Text>
          </Pressable>
        </View>
      </>
    );
  }

  if (!tid) {
    return (
      <>
        <Stack.Screen options={{ title: 'Chat' }} />
        <View className="flex-1 items-center justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
          <Text className="text-center text-base text-neutral-600 dark:text-neutral-400">This conversation could not be opened.</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ChatThreadView
        threadId={tid}
        emptyHint="No messages yet. Say hello to keep everyone aligned on timing and details."
      />
    </>
  );
}
