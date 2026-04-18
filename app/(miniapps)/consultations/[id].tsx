import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { BRAND } from '@/constants/brand';
import { MiniappHeaderBackButton } from '@/core/navigation/miniappBack';
import { consultationService } from '@/core/services/consultationService';
import { useSessionStore } from '@/core/stores/sessionStore';
import { useToastStore } from '@/core/stores/toastStore';
import { getApiErrorMessage } from '@/core/utils/apiError';

function statusIsPending(status: string): boolean {
  const s = status.toLowerCase();
  return s === 'pending' || s === 'open' || s === 'requested' || s === 'new';
}

function statusIsAccepted(status: string): boolean {
  return status.toLowerCase() === 'accepted';
}

export default function ConsultationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cid = typeof id === 'string' ? id : id?.[0] ?? '';
  const user = useSessionStore((s) => s.user);
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);

  const [messageDraft, setMessageDraft] = useState('');
  const [estimateAmount, setEstimateAmount] = useState('');
  const [estimateNote, setEstimateNote] = useState('');
  const [jobBudget, setJobBudget] = useState('');
  const [jobSchedule, setJobSchedule] = useState('');

  const detailQuery = useQuery({
    queryKey: ['consultations', 'detail', cid],
    queryFn: () => consultationService.getById(cid),
    enabled: !!user && !!cid,
  });

  const invalidate = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ['consultations'] });
  }, [qc]);

  const messageMutation = useMutation({
    mutationFn: () => consultationService.postMessage(cid, messageDraft.trim()),
    onSuccess: async () => {
      setMessageDraft('');
      showToast('Message sent');
      await invalidate();
      await detailQuery.refetch();
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Could not send message'), 'error'),
  });

  const acceptMutation = useMutation({
    mutationFn: () =>
      consultationService.respond(cid, {
        action: 'accept',
        ...(estimateAmount.trim() ? { estimateAmount: Number(estimateAmount.replace(/,/g, '')) } : {}),
        ...(estimateNote.trim() ? { estimateNote: estimateNote.trim() } : {}),
      }),
    onSuccess: async () => {
      showToast('Consultation accepted');
      await invalidate();
      await detailQuery.refetch();
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Could not respond'), 'error'),
  });

  const declineMutation = useMutation({
    mutationFn: () => consultationService.respond(cid, { action: 'decline' }),
    onSuccess: async () => {
      showToast('Consultation declined');
      await invalidate();
      await detailQuery.refetch();
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Could not respond'), 'error'),
  });

  const convertMutation = useMutation({
    mutationFn: () => {
      const budget = jobBudget.trim() ? Number(jobBudget.replace(/,/g, '')) : undefined;
      return consultationService.convertToJob(cid, {
        ...(Number.isFinite(budget) && budget != null && budget > 0 ? { budget } : {}),
        ...(jobSchedule.trim() ? { scheduleDate: jobSchedule.trim() } : {}),
      });
    },
    onSuccess: async (jobId) => {
      showToast('Job created');
      await invalidate();
      router.replace(`/jobs/${encodeURIComponent(jobId)}` as never);
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Could not convert to job'), 'error'),
  });

  const d = detailQuery.data;

  const isProviderParty = useMemo(() => {
    if (!user || !d) return false;
    if (d.providerId) return d.providerId === user.id;
    return user.role === 'provider';
  }, [d, user]);

  const isClientParty = useMemo(() => {
    if (!user || !d) return false;
    if (d.clientId) return d.clientId === user.id;
    return user.role === 'client' || user.role === 'customer';
  }, [d, user]);

  const showProviderActions = isProviderParty && d && statusIsPending(d.status);
  const showConvert = isClientParty && d && statusIsAccepted(d.status);

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Stack.Screen options={{ title: 'Consultation', headerLeft: () => <MiniappHeaderBackButton /> }} />
        <Text className="text-center text-base text-neutral-700 dark:text-neutral-300">Sign in to view this consultation.</Text>
        <Pressable
          onPress={() => router.push('/login')}
          className="mt-6 rounded-2xl px-6 py-3 active:opacity-90"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">Sign in</Text>
        </Pressable>
      </View>
    );
  }

  if (!cid) {
    return (
      <View className="flex-1 items-center justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Stack.Screen options={{ title: 'Consultation', headerLeft: () => <MiniappHeaderBackButton /> }} />
        <Text className="text-center text-neutral-600 dark:text-neutral-400">Missing consultation id.</Text>
      </View>
    );
  }

  if (detailQuery.isPending) {
    return (
      <View className="flex-1 gap-3 bg-[#eef2f7] p-4 dark:bg-neutral-950">
        <Stack.Screen options={{ title: 'Consultation', headerLeft: () => <MiniappHeaderBackButton /> }} />
        <SkeletonBlock className="h-8 w-2/3" />
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-40 w-full" />
      </View>
    );
  }

  if (detailQuery.isError || !d) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Stack.Screen options={{ title: 'Consultation', headerLeft: () => <MiniappHeaderBackButton /> }} />
        <MaterialIcons name="cloud-off" size={40} color="#737373" style={{ alignSelf: 'center' }} />
        <Text className="mt-4 text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">
          Couldn&apos;t load consultation
        </Text>
        <Text className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
          {detailQuery.isError ? getApiErrorMessage(detailQuery.error, 'Try again in a moment.') : 'Try again in a moment.'}
        </Text>
        <Pressable
          onPress={() => void detailQuery.refetch()}
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
          title: d.title.length > 28 ? `${d.title.slice(0, 28)}…` : d.title,
          headerLeft: () => <MiniappHeaderBackButton />,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <View className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <View className="flex-row flex-wrap items-center gap-2">
            <View className="rounded-full bg-[#eef2f7] px-2.5 py-1 dark:bg-neutral-800">
              <Text className="text-[11px] font-semibold capitalize text-neutral-700 dark:text-neutral-200">
                {d.status}
              </Text>
            </View>
            <Text className="text-xs capitalize text-neutral-500 dark:text-neutral-400">
              {d.type.replace(/_/g, ' ')}
            </Text>
          </View>
          <Text className="mt-2 text-lg font-bold text-neutral-900 dark:text-neutral-50">{d.title}</Text>
          {d.description ? (
            <Text className="mt-2 text-sm leading-6 text-neutral-700 dark:text-neutral-300">{d.description}</Text>
          ) : null}
          {d.location ? (
            <View className="mt-2 flex-row items-center gap-1">
              <MaterialIcons name="place" size={16} color="#737373" />
              <Text className="text-sm text-neutral-500 dark:text-neutral-400">{d.location}</Text>
            </View>
          ) : null}
          {d.estimateAmount != null ? (
            <Text className="mt-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              Estimate: ₱{d.estimateAmount}
              {d.estimateNote ? ` — ${d.estimateNote}` : ''}
            </Text>
          ) : null}
        </View>

        {showProviderActions ? (
          <View className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Your response
            </Text>
            <TextInput
              className="mt-2 rounded-xl border border-neutral-200 bg-[#eef2f7] px-3 py-2 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
              placeholder="Estimate amount (optional)"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              value={estimateAmount}
              onChangeText={setEstimateAmount}
            />
            <TextInput
              className="mt-2 rounded-xl border border-neutral-200 bg-[#eef2f7] px-3 py-2 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
              placeholder="Estimate note (optional)"
              placeholderTextColor="#9ca3af"
              value={estimateNote}
              onChangeText={setEstimateNote}
            />
            <View className="mt-3 flex-row gap-2">
              <Pressable
                disabled={declineMutation.isPending || acceptMutation.isPending}
                onPress={() => declineMutation.mutate()}
                className="flex-1 items-center rounded-xl border border-neutral-300 py-3 dark:border-neutral-600">
                <Text className="font-semibold text-neutral-800 dark:text-neutral-200">Decline</Text>
              </Pressable>
              <Pressable
                disabled={declineMutation.isPending || acceptMutation.isPending}
                onPress={() => acceptMutation.mutate()}
                className="flex-1 items-center rounded-xl py-3 active:opacity-90"
                style={{ backgroundColor: BRAND.navy }}>
                {acceptMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-semibold text-white">Accept</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : null}

        {showConvert ? (
          <View className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Convert to job
            </Text>
            <TextInput
              className="mt-2 rounded-xl border border-neutral-200 bg-[#eef2f7] px-3 py-2 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
              placeholder="Budget (PHP, optional)"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              value={jobBudget}
              onChangeText={setJobBudget}
            />
            <TextInput
              className="mt-2 rounded-xl border border-neutral-200 bg-[#eef2f7] px-3 py-2 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
              placeholder="Schedule (ISO date, optional)"
              placeholderTextColor="#9ca3af"
              value={jobSchedule}
              onChangeText={setJobSchedule}
            />
            <Pressable
              disabled={convertMutation.isPending}
              onPress={() => convertMutation.mutate()}
              className="mt-3 items-center rounded-xl py-3 active:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: BRAND.navy }}>
              {convertMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-semibold text-white">Create job</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Messages
        </Text>
        {d.messages.length === 0 ? (
          <Text className="text-sm text-neutral-600 dark:text-neutral-400">No messages yet. Say hello below.</Text>
        ) : (
          <View className="gap-2">
            {d.messages.map((m) => (
              <View
                key={m.id}
                className="rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
                {m.senderLabel ? (
                  <Text className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">{m.senderLabel}</Text>
                ) : null}
                <Text className="mt-1 text-sm leading-5 text-neutral-800 dark:text-neutral-200">{m.body}</Text>
                <Text className="mt-1 text-[10px] text-neutral-400">
                  {new Date(m.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-neutral-200 bg-white px-3 pb-4 pt-2 dark:border-neutral-800 dark:bg-neutral-950">
        <View className="flex-row items-end gap-2">
          <TextInput
            className="max-h-28 min-h-[44px] flex-1 rounded-xl border border-neutral-200 bg-[#eef2f7] px-3 py-2 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            placeholder="Write a message…"
            placeholderTextColor="#9ca3af"
            multiline
            value={messageDraft}
            onChangeText={setMessageDraft}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            disabled={messageMutation.isPending || !cid || !messageDraft.trim()}
            onPress={() => messageMutation.mutate()}
            className="mb-0.5 h-11 w-11 items-center justify-center rounded-full active:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: BRAND.navy }}>
            {messageMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <MaterialIcons name="send" size={22} color="#fff" />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}
