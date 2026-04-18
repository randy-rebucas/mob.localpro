import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { paymentService } from '@/core/services/paymentService';

export default function WalletHomeScreen() {
  const { data, isPending } = useQuery({
    queryKey: ['wallet', 'balance'],
    queryFn: () => paymentService.getWallet(),
  });

  if (isPending) {
    return (
      <View className="flex-1 gap-4 bg-neutral-50 p-4 dark:bg-neutral-950">
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-12 w-4/5" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50 p-4 dark:bg-neutral-950">
      <Text className="text-sm font-medium uppercase text-neutral-500 dark:text-neutral-400">Escrow & balance</Text>
      <Text className="mt-2 text-4xl font-bold text-neutral-900 dark:text-neutral-50">
        {data?.currency} {data?.available.toLocaleString()}
      </Text>
      <Text className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">In escrow: {data?.currency} {data?.escrow.toLocaleString()}</Text>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/wallet/transactions' as never)}
        className="mt-10 rounded-2xl bg-brand py-4 dark:bg-brand-dark">
        <Text className="text-center text-base font-semibold text-white">View transactions</Text>
      </Pressable>
    </View>
  );
}
