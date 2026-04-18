import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { BRAND } from '@/constants/brand';
import { walletService } from '@/core/services/walletService';
import { formatPeso } from '@/core/utils/money';
import { getApiErrorMessage } from '@/core/utils/apiError';

export default function WalletHomeScreen() {
  const query = useQuery({
    queryKey: ['wallet', 'overview'],
    queryFn: () => walletService.getOverview(),
  });

  if (query.isPending) {
    return (
      <View className="flex-1 gap-4 bg-neutral-50 p-4 dark:bg-neutral-950">
        <SkeletonBlock className="h-32 w-full rounded-3xl" />
        <SkeletonBlock className="h-12 w-4/5" />
        <SkeletonBlock className="h-14 w-full" />
      </View>
    );
  }

  if (query.isError) {
    return (
      <View className="flex-1 justify-center bg-neutral-50 px-6 dark:bg-neutral-950">
        <Text className="text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">Wallet unavailable</Text>
        <Text className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
          {getApiErrorMessage(query.error, 'Check your connection and try again.')}
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

  const w = query.data!;

  return (
    <ScrollView className="flex-1 bg-[#eef2f7] dark:bg-neutral-950" contentContainerClassName="grow px-5 pb-10 pt-4">
      <View
        className="overflow-hidden rounded-3xl border border-neutral-200/80 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
        <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Available balance
        </Text>
        <Text className="mt-2 text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
          {formatPeso(w.balance)}
        </Text>
        <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3 dark:bg-neutral-800/80">
          <Text className="text-sm text-neutral-600 dark:text-neutral-400">In escrow</Text>
          <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{formatPeso(w.reservedAmount)}</Text>
        </View>
      </View>

      <View className="mt-5 flex-row gap-3">
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/wallet/topup' as never)}
          className="flex-1 rounded-2xl py-3.5 active:opacity-90"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="text-center text-[15px] font-semibold text-white">Add money</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/wallet/withdraw' as never)}
          className="flex-1 rounded-2xl border-2 border-neutral-300 bg-white py-3.5 active:opacity-90 dark:border-neutral-600 dark:bg-neutral-900">
          <Text className="text-center text-[15px] font-semibold text-neutral-900 dark:text-neutral-100">Withdraw</Text>
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/wallet/transactions' as never)}
        className="mt-4 rounded-2xl border border-neutral-200 bg-white py-4 active:opacity-95 dark:border-neutral-800 dark:bg-neutral-900">
        <Text className="text-center text-[15px] font-semibold text-neutral-900 dark:text-neutral-50">All transactions</Text>
      </Pressable>

      <View className="mt-8">
        <Text className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-300">Recent activity</Text>
        {w.recentActivity.length > 0 ? (
          w.recentActivity.map((t) => (
            <View
              key={t.id}
              className="mb-2 flex-row items-center justify-between rounded-2xl border border-neutral-200/90 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
              <View className="min-w-0 flex-1 pr-3">
                <Text className="text-sm font-medium text-neutral-900 dark:text-neutral-50" numberOfLines={2}>
                  {t.label}
                </Text>
                <Text className="mt-0.5 text-[11px] text-neutral-500">
                  {new Date(t.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                </Text>
              </View>
              <Text className={`text-sm font-semibold ${t.amount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatPeso(t.amount, { signed: true })}
              </Text>
            </View>
          ))
        ) : (
          <FeatureEmptyState
            variant="compact"
            icon="history"
            title="No recent activity"
            description="Wallet movements will appear here after you top up, withdraw, or fund a job."
            primaryAction={{
              label: 'View all transactions',
              onPress: () => router.push('/wallet/transactions' as never),
              accessibilityLabel: 'View all wallet transactions',
            }}
            secondaryAction={{
              label: 'Add money',
              onPress: () => router.push('/wallet/topup' as never),
              accessibilityLabel: 'Add money to wallet',
            }}
          />
        )}
      </View>
    </ScrollView>
  );
}
