import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { BRAND } from '@/constants/brand';
import { MiniappHeaderBackButton } from '@/core/navigation/miniappBack';
import { loyaltyService } from '@/core/services/loyaltyService';
import { useSessionStore } from '@/core/stores/sessionStore';
import { useToastStore } from '@/core/stores/toastStore';
import { getApiErrorMessage } from '@/core/utils/apiError';

function formatTier(tier: string): string {
  if (!tier) return 'Bronze';
  return tier.charAt(0).toUpperCase() + tier.slice(1).toLowerCase();
}

export default function LoyaltyScreen() {
  const user = useSessionStore((s) => s.user);
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);
  const [redeemDraft, setRedeemDraft] = useState('');

  const accountQuery = useQuery({
    queryKey: ['loyalty'],
    queryFn: () => loyaltyService.getAccount(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const referralQuery = useQuery({
    queryKey: ['loyalty', 'referral'],
    queryFn: () => loyaltyService.getReferral(),
    enabled: !!user,
    staleTime: 60_000,
  });

  const redeemMutation = useMutation({
    mutationFn: (points: number) => loyaltyService.redeem(points),
    onSuccess: async () => {
      setRedeemDraft('');
      await qc.invalidateQueries({ queryKey: ['loyalty'] });
      await qc.invalidateQueries({ queryKey: ['wallet'] });
      showToast('Points redeemed to wallet');
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Could not redeem points'), 'error'),
  });

  const onRefresh = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['loyalty'] });
    void qc.invalidateQueries({ queryKey: ['loyalty', 'referral'] });
  }, [qc]);

  const shareReferral = useCallback(async () => {
    const link = referralQuery.data?.referralLink;
    const code = referralQuery.data?.referralCode;
    if (!link && !code) {
      showToast('No referral link yet', 'error');
      return;
    }
    const message = [code ? `Use my code ${code}` : null, link].filter(Boolean).join(' — ');
    try {
      await Share.share({ message });
    } catch {
      /* dismissed */
    }
  }, [referralQuery.data?.referralCode, referralQuery.data?.referralLink, showToast]);

  const points = accountQuery.data?.account.points ?? 0;
  const tier = accountQuery.data?.account.tier ?? 'bronze';
  const ledger = accountQuery.data?.ledger ?? [];

  const redeemPoints = useMemo(() => {
    const n = parseInt(redeemDraft.replace(/\D/g, ''), 10);
    return Number.isFinite(n) ? n : 0;
  }, [redeemDraft]);

  const canRedeem =
    redeemPoints >= 1 && redeemPoints <= points && !redeemMutation.isPending && points > 0;

  if (!user) {
    return (
      <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
        <Stack.Screen
          options={{
            title: 'Rewards',
            headerLeft: () => <MiniappHeaderBackButton />,
          }}
        />
        <FeatureEmptyState
          variant="full"
          icon="card-giftcard"
          title="Sign in for rewards"
          description="See your points, tier, activity, and referral link after you sign in. Redeem points for wallet credit when available."
          primaryAction={{
            label: 'Sign in',
            onPress: () => router.push('/login'),
            accessibilityLabel: 'Sign in to view loyalty rewards',
          }}
        />
      </View>
    );
  }

  if (accountQuery.isPending) {
    return (
      <View className="flex-1 gap-3 bg-[#eef2f7] p-4 dark:bg-neutral-950">
        <Stack.Screen
          options={{
            title: 'Rewards',
            headerLeft: () => <MiniappHeaderBackButton />,
          }}
        />
        <SkeletonBlock className="h-36 w-full" />
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-16 w-full" />
      </View>
    );
  }

  if (accountQuery.isError) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Stack.Screen
          options={{
            title: 'Rewards',
            headerLeft: () => <MiniappHeaderBackButton />,
          }}
        />
        <MaterialIcons name="cloud-off" size={40} color="#737373" style={{ alignSelf: 'center' }} />
        <Text className="mt-4 text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">
          Couldn&apos;t load rewards
        </Text>
        <Text className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
          {getApiErrorMessage(accountQuery.error, 'Pull to refresh or try again.')}
        </Text>
        <Pressable
          onPress={() => void accountQuery.refetch()}
          className="mt-6 self-center rounded-2xl px-6 py-3 active:opacity-90"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
      <Stack.Screen
        options={{
          title: 'Rewards',
          headerLeft: () => <MiniappHeaderBackButton />,
        }}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={accountQuery.isRefetching || referralQuery.isRefetching}
            onRefresh={onRefresh}
            tintColor={BRAND.navy}
          />
        }>
        <View className="mx-4 mt-3 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Your balance
          </Text>
          <Text className="mt-1 text-4xl font-bold text-neutral-900 dark:text-neutral-50">{points.toLocaleString()}</Text>
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">points</Text>
          <View className="mt-4 self-start rounded-full px-3 py-1.5" style={{ backgroundColor: 'rgba(0, 75, 141, 0.12)' }}>
            <Text className="text-sm font-semibold" style={{ color: BRAND.navy }}>
              {formatTier(tier)} tier
            </Text>
          </View>
        </View>

        <Text className="mb-2 mt-6 px-5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Refer friends
        </Text>
        <View className="mx-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          {referralQuery.isPending ? (
            <ActivityIndicator color={BRAND.navy} />
          ) : referralQuery.isError ? (
            <Text className="text-sm text-neutral-600 dark:text-neutral-400">
              {getApiErrorMessage(referralQuery.error, 'Referral info unavailable.')}
            </Text>
          ) : (
            <>
              <Text className="text-xs text-neutral-500 dark:text-neutral-400">Your code</Text>
              <Text className="mt-1 font-mono text-xl font-bold text-neutral-900 dark:text-neutral-50">
                {referralQuery.data?.referralCode || '—'}
              </Text>
              <Text className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">Friends referred</Text>
              <Text className="mt-0.5 text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                {referralQuery.data?.referredCount ?? 0}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share referral link"
                onPress={() => void shareReferral()}
                className="mt-4 flex-row items-center justify-center rounded-2xl py-3 active:opacity-90"
                style={{ backgroundColor: BRAND.navy }}>
                <MaterialIcons name="share" size={20} color="#fff" />
                <Text className="ml-2 font-semibold text-white">Share invite</Text>
              </Pressable>
            </>
          )}
        </View>

        <Text className="mb-2 mt-6 px-5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Redeem to wallet
        </Text>
        <View className="mx-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <Text className="text-sm leading-5 text-neutral-600 dark:text-neutral-400">
            Convert points to wallet credit (minimum 1 point, up to your balance).
          </Text>
          <TextInput
            accessibilityLabel="Points to redeem"
            className="mt-3 rounded-xl border border-neutral-200 px-3 py-3 font-mono text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50"
            placeholder="Amount"
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
            value={redeemDraft}
            onChangeText={setRedeemDraft}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Redeem points for wallet credit"
            disabled={!canRedeem}
            onPress={() => redeemMutation.mutate(redeemPoints)}
            className="mt-3 items-center rounded-2xl py-3 active:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: BRAND.navy }}>
            {redeemMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="font-semibold text-white">Redeem</Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open wallet"
            onPress={() => router.push('/wallet' as never)}
            className="mt-3 items-center py-2 active:opacity-80">
            <Text className="text-sm font-semibold" style={{ color: BRAND.navy }}>
              Open wallet
            </Text>
          </Pressable>
        </View>

        <Text className="mb-2 mt-6 px-5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Recent activity
        </Text>
        {ledger.length === 0 ? (
          <View className="mx-4 rounded-2xl border border-dashed border-neutral-300 bg-white/80 px-4 py-6 dark:border-neutral-700 dark:bg-neutral-900/80">
            <Text className="text-center text-sm text-neutral-600 dark:text-neutral-400">
              No point changes yet. Complete jobs and referrals to earn rewards.
            </Text>
          </View>
        ) : (
          <View className="mx-4 gap-2">
            {ledger.map((row, i) => (
              <View
                key={`${row.createdAt}-${i}`}
                className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
                <View className="flex-row items-start justify-between gap-2">
                  <Text className="min-w-0 flex-1 text-sm font-medium text-neutral-900 dark:text-neutral-50">{row.reason}</Text>
                  <Text
                    className={`text-sm font-semibold tabular-nums ${row.points >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {row.points >= 0 ? '+' : ''}
                    {row.points}
                  </Text>
                </View>
                <Text className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
                  {new Date(row.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
