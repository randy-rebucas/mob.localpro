import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { memo, useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { BRAND } from '@/constants/brand';
import { jobService } from '@/core/services/jobService';
import type { JobQuote } from '@/core/types/models';
import { useToastStore } from '@/core/stores/toastStore';
import { formatPeso } from '@/core/utils/money';
import { getApiErrorMessage } from '@/core/utils/apiError';

const QuoteRow = memo(function QuoteRow({
  item,
  onAccept,
  onReject,
  busyAccept,
  busyReject,
}: {
  item: JobQuote;
  onAccept: (quoteId: string) => void;
  onReject: (quoteId: string) => void;
  busyAccept: boolean;
  busyReject: boolean;
}) {
  const handleAccept = useCallback(() => onAccept(item.id), [item.id, onAccept]);
  const handleReject = useCallback(() => onReject(item.id), [item.id, onReject]);
  const pending = (item.status ?? 'pending').toLowerCase() === 'pending';
  const busy = busyAccept || busyReject;

  return (
    <View className="mx-4 mb-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{item.providerName}</Text>
        {!pending ? (
          <Text className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold uppercase text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            {item.status}
          </Text>
        ) : null}
      </View>
      <Text style={{ color: BRAND.navy }} className="mt-1 text-lg font-bold dark:text-sky-300">
        {formatPeso(item.amount)}
      </Text>
      <Text className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{item.message}</Text>
      {pending ? (
        <View className="mt-4 flex-row gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Reject quote from ${item.providerName}`}
            disabled={busy}
            onPress={handleReject}
            className="flex-1 rounded-xl border border-neutral-300 py-3 dark:border-neutral-600">
            <Text className="text-center text-sm font-semibold text-neutral-800 dark:text-neutral-200">Reject</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Accept quote from ${item.providerName}`}
            disabled={busy}
            onPress={handleAccept}
            className="flex-1 rounded-xl py-3 active:opacity-90"
            style={{ backgroundColor: BRAND.navy }}>
            <Text className="text-center text-sm font-semibold text-white">Accept</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
});

export default function JobQuotesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const jobId = typeof id === 'string' ? id : id?.[0] ?? '';
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);

  const query = useQuery({
    queryKey: ['jobs', 'quotes', jobId],
    queryFn: () => jobService.listQuotes(jobId),
    enabled: !!jobId,
  });

  const acceptMutation = useMutation({
    mutationFn: (quoteId: string) => jobService.acceptQuote(jobId, quoteId),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['jobs', 'detail', jobId] });
      await qc.invalidateQueries({ queryKey: ['jobs', 'quotes', jobId] });
      await qc.invalidateQueries({ queryKey: ['jobs', 'list'] });
      showToast(
        res.status
          ? `Quote accepted — status: ${res.status.replace(/_/g, ' ')}`
          : 'Quote accepted'
      );
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Could not accept quote'), 'error'),
  });

  const rejectMutation = useMutation({
    mutationFn: (quoteId: string) => jobService.rejectQuote(quoteId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['jobs', 'quotes', jobId] });
      showToast('Quote rejected');
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Could not reject quote'), 'error'),
  });

  if (query.isPending) {
    return (
      <View className="flex-1 gap-3 bg-[#eef2f7] p-4 dark:bg-neutral-950">
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

  if (query.isError) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Text className="text-center text-base font-semibold text-neutral-900 dark:text-neutral-100">Couldn&apos;t load quotes</Text>
        <Text className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">{getApiErrorMessage(query.error)}</Text>
        <Pressable
          onPress={() => void query.refetch()}
          className="mt-6 self-center rounded-2xl px-6 py-3 active:opacity-90"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  const busyAccept = acceptMutation.isPending;
  const busyReject = rejectMutation.isPending;

  return (
    <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
      <FlatList
        data={query.data ?? []}
        keyExtractor={(q) => q.id}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}
        ListEmptyComponent={
          <Text className="mt-10 px-4 text-center text-neutral-500 dark:text-neutral-400">
            No quotes yet. Providers will appear here when they respond.
          </Text>
        }
        renderItem={({ item }) => (
          <QuoteRow
            item={item}
            busyAccept={busyAccept}
            busyReject={busyReject}
            onAccept={(quoteId) => acceptMutation.mutate(quoteId)}
            onReject={(quoteId) => rejectMutation.mutate(quoteId)}
          />
        )}
      />
    </View>
  );
}
