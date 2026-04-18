import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { BRAND } from '@/constants/brand';
import { walletService } from '@/core/services/walletService';
import { useToastStore } from '@/core/stores/toastStore';
import { formatPeso } from '@/core/utils/money';
import { getApiErrorMessage } from '@/core/utils/apiError';

export default function WalletWithdrawScreen() {
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);
  const overview = useQuery({
    queryKey: ['wallet', 'overview'],
    queryFn: () => walletService.getOverview(),
  });

  const [amountText, setAmountText] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      walletService.requestWithdrawal({
        amount: parseAmount()!,
        bankName,
        accountNumber,
        accountName,
      }),
    onSuccess: async (res) => {
      showToast(res.message ?? 'Withdrawal request submitted');
      await qc.invalidateQueries({ queryKey: ['wallet'] });
      router.back();
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Request failed'), 'error'),
  });

  function parseAmount(): number | null {
    const raw = amountText.replace(/,/g, '').trim();
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(n);
  }

  function onSubmit() {
    const n = parseAmount();
    const bal = overview.data?.balance ?? 0;
    if (n == null) {
      showToast('Enter a valid amount', 'error');
      return;
    }
    if (n > bal) {
      showToast('Amount exceeds available balance', 'error');
      return;
    }
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      showToast('Fill in all bank details', 'error');
      return;
    }
    mutation.mutate();
  }

  if (overview.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <ActivityIndicator color={BRAND.navy} />
      </View>
    );
  }

  if (overview.isError) {
    return (
      <View className="flex-1 justify-center bg-neutral-50 px-6 dark:bg-neutral-950">
        <Text className="text-center text-sm text-neutral-600 dark:text-neutral-400">{getApiErrorMessage(overview.error)}</Text>
        <Pressable onPress={() => void overview.refetch()} className="mt-6 self-center" style={{ backgroundColor: BRAND.navy }}>
          <Text className="px-6 py-3 font-semibold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  const bal = overview.data!.balance;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-neutral-50 dark:bg-neutral-950">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="grow px-5 pb-8 pt-4">
        <Text className="text-sm text-neutral-600 dark:text-neutral-400">
          Available: <Text className="font-semibold text-neutral-900 dark:text-neutral-100">{formatPeso(bal)}</Text>
        </Text>
        <Text className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          Withdrawals are reviewed by LocalPro. Escrow funds are not included in available balance.
        </Text>

        <Field label="Amount (PHP)" className="mt-6">
          <TextInput
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="number-pad"
            placeholder="Amount to withdraw"
            placeholderTextColor="#9ca3af"
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          />
        </Field>
        <Field label="Bank name">
          <TextInput
            value={bankName}
            onChangeText={setBankName}
            placeholder="e.g. BDO"
            placeholderTextColor="#9ca3af"
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          />
        </Field>
        <Field label="Account number">
          <TextInput
            value={accountNumber}
            onChangeText={setAccountNumber}
            keyboardType="number-pad"
            placeholder="Account / card number"
            placeholderTextColor="#9ca3af"
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          />
        </Field>
        <Field label="Account name (as on bank records)">
          <TextInput
            value={accountName}
            onChangeText={setAccountName}
            placeholder="Full name"
            placeholderTextColor="#9ca3af"
            autoCapitalize="words"
            className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          />
        </Field>

        <Pressable
          accessibilityRole="button"
          disabled={mutation.isPending}
          onPress={onSubmit}
          className="mt-8 flex-row items-center justify-center rounded-2xl py-4 active:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: BRAND.navy }}>
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">Submit request</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <View className={className ?? 'mt-4'}>
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</Text>
      {children}
    </View>
  );
}
