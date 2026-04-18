import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { BRAND } from '@/constants/brand';
import { MiniappHeaderBackButton } from '@/core/navigation/miniappBack';
import { knowledgeService } from '@/core/services/knowledgeService';
import { useSessionStore } from '@/core/stores/sessionStore';
import { getApiErrorMessage } from '@/core/utils/apiError';

export default function SupportArticleDetailScreen() {
  const insets = useSafeAreaInsets();
  const user = useSessionStore((s) => s.user);
  const { id } = useLocalSearchParams<{ id: string }>();
  const articleId = typeof id === 'string' ? id : id?.[0] ?? '';

  const query = useQuery({
    queryKey: ['knowledge', 'article', articleId],
    queryFn: () => knowledgeService.getById(articleId),
    enabled: !!user && !!articleId,
  });

  const title = query.data?.title ?? 'Article';

  if (!user) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Stack.Screen
          options={{
            title: 'Article',
            headerLeft: () => <MiniappHeaderBackButton />,
          }}
        />
        <Text className="text-center text-base text-neutral-700 dark:text-neutral-300">Sign in to read this article.</Text>
        <Pressable
          onPress={() => router.push('/login')}
          className="mt-6 self-center rounded-2xl px-6 py-3 active:opacity-90"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">Sign in</Text>
        </Pressable>
      </View>
    );
  }

  if (!articleId) {
    return (
      <View className="flex-1 items-center justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Stack.Screen
          options={{
            title: 'Article',
            headerLeft: () => <MiniappHeaderBackButton />,
          }}
        />
        <Text className="text-center text-neutral-600 dark:text-neutral-400">Missing article id.</Text>
      </View>
    );
  }

  if (query.isPending) {
    return (
      <View className="flex-1 gap-3 bg-[#eef2f7] p-4 dark:bg-neutral-950">
        <Stack.Screen
          options={{
            title: 'Article',
            headerLeft: () => <MiniappHeaderBackButton />,
          }}
        />
        <SkeletonBlock className="h-8 w-4/5" />
        <SkeletonBlock className="h-64 w-full" />
      </View>
    );
  }

  if (query.isError) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Stack.Screen
          options={{
            title: 'Article',
            headerLeft: () => <MiniappHeaderBackButton />,
          }}
        />
        <MaterialIcons name="cloud-off" size={40} color="#737373" style={{ alignSelf: 'center' }} />
        <Text className="mt-4 text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">
          Couldn&apos;t load article
        </Text>
        <Text className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
          {getApiErrorMessage(query.error, 'Try again in a moment.')}
        </Text>
        <Pressable
          onPress={() => void query.refetch()}
          className="mt-6 self-center rounded-2xl px-6 py-3 active:opacity-90"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  const a = query.data;

  return (
    <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
      <Stack.Screen
        options={{
          title,
          headerLeft: () => <MiniappHeaderBackButton />,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
        {a.group ? (
          <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{a.group}</Text>
        ) : null}
        <Text className={`text-xl font-semibold text-neutral-900 dark:text-neutral-50 ${a.group ? 'mt-2' : ''}`}>{a.title}</Text>
        {a.excerpt ? (
          <Text className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-400">{a.excerpt}</Text>
        ) : null}
        <View className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <Text className="whitespace-pre-wrap font-mono text-sm leading-6 text-neutral-800 dark:text-neutral-200">{a.content}</Text>
        </View>
        <Text className="mt-4 text-center text-xs text-neutral-500 dark:text-neutral-400">
          Content is shown as plain text. Formatting may differ from the web help center.
        </Text>
      </ScrollView>
    </View>
  );
}
