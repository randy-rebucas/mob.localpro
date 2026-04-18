import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { BRAND } from '@/constants/brand';
import { walletService } from '@/core/services/walletService';
import { useToastStore } from '@/core/stores/toastStore';
import { formatPeso } from '@/core/utils/money';
import { getApiErrorMessage } from '@/core/utils/apiError';

const MIN = 100;
const MAX = 100_000;

export default function WalletTopUpScreen() {
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);
  const [amountText, setAmountText] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const topUpMutation = useMutation({
    mutationFn: (amount: number) => walletService.createTopUp(amount),
    onSuccess: async (res) => {
      setSessionId(res.sessionId);
      await WebBrowser.openBrowserAsync(res.checkoutUrl);
      showToast('Complete payment in the browser, then return here to verify.');
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Could not start top-up'), 'error'),
  });

  const verifyMutation = useMutation({
    mutationFn: (sid: string) => walletService.verifyTopUp(sid),
    onSuccess: async (res) => {
      if (res.credited) {
        showToast(res.message ?? `Credited ${formatPeso(res.amount ?? 0)}`);
        await qc.invalidateQueries({ queryKey: ['wallet'] });
        router.back();
      } else {
        showToast(res.message ?? 'Payment not confirmed yet. Try again in a moment.', 'error');
      }
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Verification failed'), 'error'),
  });

  function parseAmount(): number | null {
    const raw = amountText.replace(/,/g, '').trim();
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(n);
  }

  function onContinue() {
    const n = parseAmount();
    if (n == null) {
      showToast('Enter a valid amount', 'error');
      return;
    }
    if (n < MIN) {
      showToast(`Minimum top-up is ${formatPeso(MIN)}`, 'error');
      return;
    }
    if (n > MAX) {
      showToast(`Maximum per top-up is ${formatPeso(MAX)}`, 'error');
      return;
    }
    topUpMutation.mutate(n);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="grow px-5 pb-8 pt-4">
        <Text className="text-sm leading-5 text-neutral-600 dark:text-neutral-400">
          Add funds with PayMongo (min {formatPeso(MIN)}, max {formatPeso(MAX)} per checkout).
        </Text>

        <Text className="mt-6 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Amount (PHP)</Text>
        <TextInput
          value={amountText}
          onChangeText={setAmountText}
          keyboardType="number-pad"
          placeholder="e.g. 500"
          placeholderTextColor="#9ca3af"
          editable={!topUpMutation.isPending}
          className="mt-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 text-lg text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
        />

        <Pressable
          accessibilityRole="button"
          disabled={topUpMutation.isPending}
          onPress={onContinue}
          className="mt-8 flex-row items-center justify-center rounded-2xl py-4 active:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: BRAND.navy }}>
          {topUpMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">Continue to checkout</Text>
          )}
        </Pressable>

        {sessionId ? (
          <Pressable
            accessibilityRole="button"
            disabled={verifyMutation.isPending}
            onPress={() => verifyMutation.mutate(sessionId)}
            className="mt-4 flex-row items-center justify-center rounded-2xl border-2 py-4 active:opacity-90 disabled:opacity-50"
            style={{ borderColor: BRAND.green }}>
            {verifyMutation.isPending ? (
              <ActivityIndicator color={BRAND.green} />
            ) : (
              <Text style={{ color: BRAND.green }} className="text-base font-semibold">
                I&apos;ve completed payment — verify
              </Text>
            )}
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
