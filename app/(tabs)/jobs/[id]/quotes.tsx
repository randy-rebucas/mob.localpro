import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { memo, useCallback } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { jobService } from '@/core/services/jobService';
import type { JobQuote } from '@/core/types/models';
import { useToastStore } from '@/core/stores/toastStore';

const QuoteRow = memo(function QuoteRow({
  item,
  onAccept,
  busy,
}: {
  item: JobQuote;
  onAccept: (quoteId: string) => void;
  busy: boolean;
}) {
  const handleAccept = useCallback(() => {
    onAccept(item.id);
  }, [item.id, onAccept]);

  return (
    <View className="mx-4 mb-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{item.providerName}</Text>
      <Text className="mt-1 text-lg font-bold text-brand dark:text-brand-muted">₱{item.amount.toLocaleString()}</Text>
      <Text className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{item.message}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Accept quote from ${item.providerName}`}
        disabled={busy}
        onPress={handleAccept}
        className="mt-4 rounded-xl bg-neutral-900 py-3 dark:bg-neutral-100">
        <Text className="text-center text-sm font-semibold text-white dark:text-neutral-900">{busy ? 'Accepting…' : 'Accept quote'}</Text>
      </Pressable>
    </View>
  );
});

export default function JobQuotesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const jobId = typeof id === 'string' ? id : id?.[0] ?? '';
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);

  const { data, isPending } = useQuery({
    queryKey: ['jobs', 'quotes', jobId],
    queryFn: () => jobService.listQuotes(jobId),
    enabled: !!jobId,
  });

  const acceptMutation = useMutation({
    mutationFn: (quoteId: string) => jobService.acceptQuote(jobId, quoteId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['jobs', 'detail', jobId] });
      showToast('Quote accepted — job in progress');
    },
    onError: () => showToast('Could not accept quote', 'error'),
  });

  if (isPending) {
    return (
      <View className="flex-1 gap-3 bg-neutral-50 p-4 dark:bg-neutral-950">
        {[1, 2].map((k) => (
          <View key={k} className="gap-2">
            <SkeletonBlock className="h-6 w-3/5" />
            <SkeletonBlock className="h-8 w-2/5" />
            <SkeletonBlock className="h-16 w-full" />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <FlatList
        data={data ?? []}
        keyExtractor={(q) => q.id}
        ListEmptyComponent={
          <Text className="mt-10 px-4 text-center text-neutral-500">No quotes yet. Check back soon.</Text>
        }
        renderItem={({ item }) => (
          <QuoteRow item={item} busy={acceptMutation.isPending} onAccept={(quoteId) => acceptMutation.mutate(quoteId)} />
        )}
      />
    </View>
  );
}
