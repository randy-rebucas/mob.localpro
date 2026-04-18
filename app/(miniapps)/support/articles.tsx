import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { memo, useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { BRAND } from '@/constants/brand';
import { MiniappHeaderBackButton } from '@/core/navigation/miniappBack';
import { knowledgeService, type KnowledgeArticleSummary } from '@/core/services/knowledgeService';
import { useSessionStore } from '@/core/stores/sessionStore';
import { getApiErrorMessage } from '@/core/utils/apiError';

const Row = memo(function Row({ item }: { item: KnowledgeArticleSummary }) {
  const go = useCallback(() => {
    router.push(`/support/articles/${item.id}` as never);
  }, [item.id]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.title}
      onPress={go}
      className="mx-4 mb-3 rounded-2xl border border-neutral-200 bg-white p-4 active:opacity-95 dark:border-neutral-800 dark:bg-neutral-900">
      <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{item.title}</Text>
      {item.excerpt ? (
        <Text className="mt-2 text-sm leading-5 text-neutral-600 dark:text-neutral-400" numberOfLines={3}>
          {item.excerpt}
        </Text>
      ) : null}
      {item.group ? (
        <Text className="mt-2 text-xs font-medium text-neutral-400 dark:text-neutral-500">{item.group}</Text>
      ) : null}
    </Pressable>
  );
});

export default function SupportArticlesScreen() {
  const user = useSessionStore((s) => s.user);

  const query = useQuery({
    queryKey: ['knowledge', 'list'],
    queryFn: () => knowledgeService.list(),
    enabled: !!user,
    staleTime: 120_000,
  });

  if (!user) {
    return (
      <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
        <Stack.Screen
          options={{
            title: 'Help articles',
            headerLeft: () => <MiniappHeaderBackButton />,
          }}
        />
        <FeatureEmptyState
          variant="full"
          icon="menu-book"
          title="Sign in for help articles"
          description="Guides and FAQs are tailored to your account after you sign in."
          primaryAction={{
            label: 'Sign in',
            onPress: () => router.push('/login'),
            accessibilityLabel: 'Sign in to read help articles',
          }}
        />
      </View>
    );
  }

  if (query.isPending) {
    return (
      <View className="flex-1 gap-3 bg-[#eef2f7] p-4 dark:bg-neutral-950">
        <Stack.Screen
          options={{
            title: 'Help articles',
            headerLeft: () => <MiniappHeaderBackButton />,
          }}
        />
        {[1, 2, 3].map((k) => (
          <SkeletonBlock key={k} className="h-20 w-full" />
        ))}
      </View>
    );
  }

  if (query.isError) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Stack.Screen
          options={{
            title: 'Help articles',
            headerLeft: () => <MiniappHeaderBackButton />,
          }}
        />
        <MaterialIcons name="cloud-off" size={40} color="#737373" style={{ alignSelf: 'center' }} />
        <Text className="mt-4 text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">
          Couldn&apos;t load articles
        </Text>
        <Text className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
          {getApiErrorMessage(query.error, 'Pull to refresh or try again.')}
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

  const rows = query.data ?? [];

  return (
    <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
      <Stack.Screen
        options={{
          title: 'Help articles',
          headerLeft: () => <MiniappHeaderBackButton />,
        }}
      />
      <FlatList
        data={rows}
        keyExtractor={(a) => a.id}
        contentContainerStyle={
          rows.length === 0 ? { flexGrow: 1, paddingTop: 8, paddingBottom: 24 } : { paddingTop: 8, paddingBottom: 24 }
        }
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={BRAND.navy} />
        }
        renderItem={({ item }) => <Row item={item} />}
        ListEmptyComponent={
          <FeatureEmptyState
            variant="full"
            icon="menu-book"
            title="No articles yet"
            description="Published guides from LocalPro will appear here when the knowledge base is enabled on the server."
          />
        }
      />
    </View>
  );
}
