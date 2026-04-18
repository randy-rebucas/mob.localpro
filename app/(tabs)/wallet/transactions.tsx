import { useInfiniteQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, Pressable, Text, View } from 'react-native';

import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { BRAND } from '@/constants/brand';
import { walletService } from '@/core/services/walletService';
import { formatPeso } from '@/core/utils/money';
import { getApiErrorMessage } from '@/core/utils/apiError';

const PAGE_SIZE = 20;

export default function WalletTransactionsScreen() {
  const query = useInfiniteQuery({
    queryKey: ['wallet', 'transactions'],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => walletService.listTransactionsPage(pageParam as number, PAGE_SIZE),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });

  const flat = query.data?.pages.flatMap((p) => p.items) ?? [];

  if (query.isPending) {
    return (
      <View className="flex-1 gap-3 bg-[#eef2f7] p-4 dark:bg-neutral-950">
        {[1, 2, 3, 4].map((k) => (
          <SkeletonBlock key={k} className="h-14 w-full" />
        ))}
      </View>
    );
  }

  if (query.isError) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Text className="text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">Couldn&apos;t load transactions</Text>
        <Text className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
          {getApiErrorMessage(query.error)}
        </Text>
        <Pressable
          onPress={() => void query.refetch()}
          className="mt-8 self-center rounded-2xl px-8 py-3.5 active:opacity-90"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
      <FlatList
        data={flat}
        keyExtractor={(t) => t.id}
        contentContainerStyle={flat.length === 0 ? { flexGrow: 1 } : undefined}
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={BRAND.navy} />
        }
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) {
            void query.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.35}
        ListFooterComponent={
          query.isFetchingNextPage ? (
            <View className="py-4">
              <ActivityIndicator color={BRAND.navy} />
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View className="mx-4 mb-3 flex-row items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <View className="min-w-0 flex-1 pr-3">
              <Text className="text-base font-medium text-neutral-900 dark:text-neutral-50">{item.label}</Text>
              <Text className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                {new Date(item.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              </Text>
            </View>
            <Text className={`text-base font-semibold ${item.amount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {formatPeso(item.amount, { signed: true })}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <FeatureEmptyState
            variant="full"
            icon="receipt-long"
            title="No transactions yet"
            description="Top up your wallet or fund a job — credits, debits, and escrow movements show up here."
            primaryAction={{
              label: 'Add money',
              onPress: () => router.push('/wallet/topup' as never),
              accessibilityLabel: 'Add money to wallet',
            }}
            secondaryAction={{
              label: 'Browse jobs',
              onPress: () => router.push('/jobs' as never),
              accessibilityLabel: 'Browse jobs',
            }}
          />
        }
      />
    </View>
  );
}
