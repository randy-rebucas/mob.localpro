import { useQuery } from '@tanstack/react-query';
import { FlatList, RefreshControl, Text, View } from 'react-native';

import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { paymentService } from '@/core/services/paymentService';

export default function WalletTransactionsScreen() {
  const { data, isPending, isRefetching, refetch } = useQuery({
    queryKey: ['wallet', 'transactions'],
    queryFn: () => paymentService.listTransactions(),
  });

  if (isPending) {
    return (
      <View className="flex-1 gap-3 bg-neutral-50 p-4 dark:bg-neutral-950">
        {[1, 2, 3, 4].map((k) => (
          <SkeletonBlock key={k} className="h-14 w-full" />
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
        renderItem={({ item }) => (
          <View className="mx-4 mb-3 flex-row items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <View className="flex-1 pr-3">
              <Text className="text-base font-medium text-neutral-900 dark:text-neutral-50">{item.label}</Text>
              <Text className="mt-1 text-xs text-neutral-500">{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
            <Text className={`text-base font-semibold ${item.amount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {item.amount < 0 ? '-' : '+'}₱{Math.abs(item.amount).toLocaleString()}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
