import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { BRAND } from '@/constants/brand';
import { jobService } from '@/core/services/jobService';
import { useSessionStore } from '@/core/stores/sessionStore';
import { useToastStore } from '@/core/stores/toastStore';
import { formatPeso } from '@/core/utils/money';
import { getApiErrorMessage } from '@/core/utils/apiError';

function statusKey(s: string) {
  return s.toLowerCase().replace(/\s+/g, '_');
}

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const jobId = typeof id === 'string' ? id : id?.[0] ?? '';
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);
  const viewerRole = useSessionStore((s) => s.user?.role);

  const query = useQuery({
    queryKey: ['jobs', 'detail', jobId],
    queryFn: () => jobService.getJob(jobId),
    enabled: !!jobId,
  });

  const fundMutation = useMutation({
    mutationFn: () => jobService.fundEscrow(jobId),
    onSuccess: async (res) => {
      if (res.kind === 'checkout') {
        const ok = await Linking.canOpenURL(res.checkoutUrl);
        if (ok) {
          await Linking.openURL(res.checkoutUrl);
          showToast('Complete checkout in your browser, then return to the app.');
        } else {
          showToast('Could not open checkout link', 'error');
        }
      } else {
        showToast(res.message ?? 'Escrow updated');
      }
      await qc.invalidateQueries({ queryKey: ['jobs', 'detail', jobId] });
      await qc.invalidateQueries({ queryKey: ['jobs', 'list'] });
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Could not start funding'), 'error'),
  });

  const walletFundMutation = useMutation({
    mutationFn: () => jobService.fundEscrowFromWallet(jobId),
    onSuccess: async () => {
      showToast('Escrow funded from wallet');
      await qc.invalidateQueries({ queryKey: ['jobs', 'detail', jobId] });
      await qc.invalidateQueries({ queryKey: ['jobs', 'list'] });
      await qc.invalidateQueries({ queryKey: ['wallet'] });
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Wallet funding failed'), 'error'),
  });

  if (query.isPending) {
    return (
      <View className="flex-1 gap-3 bg-[#eef2f7] p-4 dark:bg-neutral-950">
        <SkeletonBlock className="h-8 w-11/12" />
        <SkeletonBlock className="h-24 w-full" />
      </View>
    );
  }

  if (query.isError) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Text className="text-center text-base font-semibold text-neutral-900 dark:text-neutral-100">Couldn&apos;t load job</Text>
        <Text className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">{getApiErrorMessage(query.error)}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void query.refetch()}
          className="mt-6 self-center rounded-2xl px-6 py-3 active:opacity-90"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  const job = query.data;
  if (!job) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Text className="text-center text-lg font-semibold text-neutral-900 dark:text-neutral-100">Job not found</Text>
        <Text className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">It may have been removed or you don&apos;t have access.</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          className="mt-8 self-center rounded-2xl border border-neutral-300 px-6 py-3 dark:border-neutral-600">
          <Text className="font-semibold text-neutral-800 dark:text-neutral-200">Go back</Text>
        </Pressable>
      </View>
    );
  }

  const st = statusKey(job.status);
  const terminal = st === 'completed' || st === 'cancelled';
  const isClient = viewerRole === 'client';
  const showFund = !terminal && isClient;
  const showCancel = (st === 'open' || st === 'assigned') && isClient;
  const showReview = st === 'completed' && isClient;
  const budgetLabel =
    job.budgetMax != null || job.budgetMin != null
      ? job.budgetMax != null && job.budgetMin != null && job.budgetMax !== job.budgetMin
        ? `${formatPeso(job.budgetMin)} – ${formatPeso(job.budgetMax)}`
        : formatPeso(job.budgetMin ?? job.budgetMax ?? 0)
      : null;

  return (
    <>
      <Stack.Screen options={{ title: job.title }} />
      <ScrollView className="flex-1 bg-[#eef2f7] dark:bg-neutral-950" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{job.title}</Text>
      <View className="mt-3 flex-row flex-wrap gap-2">
        <Text className="rounded-full bg-neutral-200 px-3 py-1 text-xs font-semibold uppercase text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
          {job.status.replace(/_/g, ' ')}
        </Text>
        {job.locationLabel ? (
          <Text className="rounded-full bg-brand-muted/40 px-3 py-1 text-xs font-medium text-brand-dark dark:text-brand-muted">
            {job.locationLabel}
          </Text>
        ) : null}
      </View>
      {budgetLabel ? (
        <Text style={{ color: BRAND.navy }} className="mt-4 text-lg font-semibold dark:text-sky-300">
          {budgetLabel}
        </Text>
      ) : null}
      <Text className="mt-4 text-base leading-6 text-neutral-700 dark:text-neutral-300">{job.description}</Text>

      {showFund ? (
        <View className="mt-8 gap-2 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">Escrow funding</Text>
          <Text className="text-xs leading-5 text-neutral-600 dark:text-neutral-400">
            PayMongo checkout or pay from your LocalPro wallet when you&apos;re ready to commit funds for this job.
          </Text>
          <View className="mt-2 flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fund with PayMongo checkout"
              disabled={fundMutation.isPending || walletFundMutation.isPending}
              onPress={() => fundMutation.mutate()}
              className="flex-1 items-center justify-center rounded-xl py-3 active:opacity-90"
              style={{ backgroundColor: BRAND.navy }}>
              {fundMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-center text-sm font-semibold text-white">PayMongo checkout</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fund from wallet"
              disabled={fundMutation.isPending || walletFundMutation.isPending}
              onPress={() => walletFundMutation.mutate()}
              className="flex-1 rounded-xl border-2 py-3 active:opacity-90"
              style={{ borderColor: BRAND.navy }}>
              {walletFundMutation.isPending ? (
                <ActivityIndicator color={BRAND.navy} />
              ) : (
                <Text style={{ color: BRAND.navy }} className="text-center text-sm font-semibold dark:text-sky-300">
                  Use wallet
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}

      <View className="mt-8 gap-3">
        <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Actions</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/jobs/${job.id}/quotes` as never)}
          className="flex-row items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-4 dark:border-neutral-800 dark:bg-neutral-900">
          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">Quotes</Text>
          <MaterialIcons name="chevron-right" size={22} color="#737373" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/jobs/${job.id}/chat` as never)}
          className="flex-row items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-4 dark:border-neutral-800 dark:bg-neutral-900">
          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">Job chat</Text>
          <MaterialIcons name="chevron-right" size={22} color="#737373" />
        </Pressable>
        {showReview ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/jobs/${job.id}/review` as never)}
            className="flex-row items-center justify-between rounded-2xl px-4 py-4 active:opacity-90"
            style={{ backgroundColor: BRAND.navy }}>
            <Text className="text-base font-semibold text-white">Leave a review</Text>
            <MaterialIcons name="chevron-right" size={22} color="#ffffff" />
          </Pressable>
        ) : null}
        {showCancel ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/jobs/${job.id}/cancel` as never)}
            className="flex-row items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-4 dark:border-red-900 dark:bg-red-950/40">
            <Text className="text-base font-semibold text-red-800 dark:text-red-200">Cancel job</Text>
            <MaterialIcons name="chevron-right" size={22} color="#b91c1c" />
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
    </>
  );
}
