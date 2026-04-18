import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { BRAND } from '@/constants/brand';
import { MiniappHeaderBackButton } from '@/core/navigation/miniappBack';
import { recurringService } from '@/core/services/recurringService';
import { useSessionStore } from '@/core/stores/sessionStore';
import { useToastStore } from '@/core/stores/toastStore';
import { getApiErrorMessage } from '@/core/utils/apiError';

function normStatus(s: string): string {
  return s.toLowerCase();
}

export default function RecurringDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const rid = typeof id === 'string' ? id : id?.[0] ?? '';
  const user = useSessionStore((s) => s.user);
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);

  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editBudget, setEditBudget] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [showEdit, setShowEdit] = useState(false);

  const detailQuery = useQuery({
    queryKey: ['recurring', 'detail', rid],
    queryFn: () => recurringService.getById(rid),
    enabled: !!user && !!rid,
  });

  const savedMethodQuery = useQuery({
    queryKey: ['recurring', 'savedMethod'],
    queryFn: () => recurringService.getSavedMethod(),
    enabled: !!user,
    staleTime: 60_000,
  });

  const d = detailQuery.data;

  useEffect(() => {
    if (d) {
      setEditTitle(d.title);
      setEditDescription(d.description);
      setEditBudget(d.budget != null ? String(d.budget) : '');
      setEditLocation(d.location ?? '');
    }
  }, [d]);

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ['recurring'] });
  };

  const refetchDetail = () => detailQuery.refetch();

  const pauseMutation = useMutation({
    mutationFn: () => recurringService.control(rid, 'pause'),
    onSuccess: async () => {
      showToast('Schedule paused');
      await invalidate();
      await refetchDetail();
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Could not pause'), 'error'),
  });

  const resumeMutation = useMutation({
    mutationFn: () => recurringService.control(rid, 'resume'),
    onSuccess: async () => {
      showToast('Schedule resumed');
      await invalidate();
      await refetchDetail();
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Could not resume'), 'error'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => recurringService.control(rid, 'cancel'),
    onSuccess: async () => {
      showToast('Schedule cancelled');
      await invalidate();
      await refetchDetail();
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Could not cancel'), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: () => {
      const budgetNum = editBudget.trim() ? Number(editBudget.replace(/,/g, '')) : undefined;
      return recurringService.update(rid, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        ...(editLocation.trim() ? { location: editLocation.trim() } : {}),
        ...(Number.isFinite(budgetNum) && budgetNum != null && budgetNum > 0 ? { budget: budgetNum } : {}),
      });
    },
    onSuccess: async () => {
      showToast('Schedule updated');
      setShowEdit(false);
      await invalidate();
      await refetchDetail();
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Could not save'), 'error'),
  });

  const deleteMethodMutation = useMutation({
    mutationFn: () => recurringService.deleteSavedMethod(),
    onSuccess: async () => {
      showToast('Saved card removed');
      await savedMethodQuery.refetch();
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Could not remove card'), 'error'),
  });

  const status = d ? normStatus(d.status) : '';
  const isCancelled = status === 'cancelled' || status === 'canceled';
  const isPaused = status === 'paused';
  const isActive = !isCancelled && !isPaused;

  const busyControl = pauseMutation.isPending || resumeMutation.isPending || cancelMutation.isPending;

  const saved = savedMethodQuery.data;

  const headerTitle = useMemo(() => {
    if (!d) return 'Schedule';
    return d.title.length > 26 ? `${d.title.slice(0, 26)}…` : d.title;
  }, [d]);

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Stack.Screen options={{ title: 'Schedule', headerLeft: () => <MiniappHeaderBackButton /> }} />
        <Text className="text-center text-base text-neutral-700 dark:text-neutral-300">Sign in to view this schedule.</Text>
        <Pressable
          onPress={() => router.push('/login')}
          className="mt-6 rounded-2xl px-6 py-3 active:opacity-90"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">Sign in</Text>
        </Pressable>
      </View>
    );
  }

  if (!rid) {
    return (
      <View className="flex-1 items-center justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Stack.Screen options={{ title: 'Schedule', headerLeft: () => <MiniappHeaderBackButton /> }} />
        <Text className="text-center text-neutral-600 dark:text-neutral-400">Missing schedule id.</Text>
      </View>
    );
  }

  if (detailQuery.isPending) {
    return (
      <View className="flex-1 gap-3 bg-[#eef2f7] p-4 dark:bg-neutral-950">
        <Stack.Screen options={{ title: 'Schedule', headerLeft: () => <MiniappHeaderBackButton /> }} />
        <SkeletonBlock className="h-8 w-2/3" />
        <SkeletonBlock className="h-32 w-full" />
      </View>
    );
  }

  if (detailQuery.isError || !d) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Stack.Screen options={{ title: 'Schedule', headerLeft: () => <MiniappHeaderBackButton /> }} />
        <MaterialIcons name="cloud-off" size={40} color="#737373" style={{ alignSelf: 'center' }} />
        <Text className="mt-4 text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">
          Couldn&apos;t load schedule
        </Text>
        <Text className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
          {detailQuery.isError ? getApiErrorMessage(detailQuery.error, 'Try again.') : 'Try again.'}
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
          title: headerTitle,
          headerLeft: () => <MiniappHeaderBackButton />,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <View className="flex-row flex-wrap items-center justify-between gap-2">
            <View className="rounded-full bg-[#eef2f7] px-2.5 py-1 dark:bg-neutral-800">
              <Text className="text-[11px] font-semibold capitalize text-neutral-700 dark:text-neutral-200">{d.status}</Text>
            </View>
            <Text className="text-xs capitalize text-neutral-500 dark:text-neutral-400">{d.frequency}</Text>
          </View>
          <Text className="mt-2 text-xl font-bold text-neutral-900 dark:text-neutral-50">{d.title}</Text>
          <Text className="mt-2 text-sm leading-6 text-neutral-700 dark:text-neutral-300">{d.description}</Text>
          {d.scheduleDate ? (
            <Text className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Next / anchor: {d.scheduleDate}</Text>
          ) : null}
          {d.location ? (
            <View className="mt-2 flex-row items-center gap-1">
              <MaterialIcons name="place" size={16} color="#737373" />
              <Text className="text-sm text-neutral-600 dark:text-neutral-400">{d.location}</Text>
            </View>
          ) : null}
          {d.budget != null ? (
            <Text className="mt-2 text-sm font-semibold text-neutral-800 dark:text-neutral-200">Budget ₱{d.budget}</Text>
          ) : null}
          {d.maxRuns != null ? (
            <Text className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">Max runs: {d.maxRuns}</Text>
          ) : null}
          {d.autoPayEnabled ? (
            <Text className="mt-1 text-sm text-emerald-700 dark:text-emerald-400">Auto-pay enabled</Text>
          ) : null}
          {d.specialInstructions ? (
            <Text className="mt-3 text-sm italic text-neutral-600 dark:text-neutral-400">{d.specialInstructions}</Text>
          ) : null}
        </View>

        {!isCancelled ? (
          <View className="mt-4 gap-2">
            <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Controls
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {isActive ? (
                <Pressable
                  disabled={busyControl}
                  onPress={() => pauseMutation.mutate()}
                  className="flex-1 min-w-[100px] items-center rounded-xl border border-neutral-300 py-3 dark:border-neutral-600">
                  {pauseMutation.isPending ? (
                    <ActivityIndicator />
                  ) : (
                    <Text className="font-semibold text-neutral-800 dark:text-neutral-200">Pause</Text>
                  )}
                </Pressable>
              ) : null}
              {isPaused ? (
                <Pressable
                  disabled={busyControl}
                  onPress={() => resumeMutation.mutate()}
                  className="flex-1 min-w-[100px] items-center rounded-xl py-3"
                  style={{ backgroundColor: BRAND.navy }}>
                  {resumeMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="font-semibold text-white">Resume</Text>
                  )}
                </Pressable>
              ) : null}
              <Pressable
                disabled={busyControl}
                onPress={() => {
                  Alert.alert('Cancel schedule', 'This will stop future runs. Continue?', [
                    { text: 'No', style: 'cancel' },
                    { text: 'Yes, cancel', style: 'destructive', onPress: () => cancelMutation.mutate() },
                  ]);
                }}
                className="flex-1 min-w-[100px] items-center rounded-xl border border-red-200 py-3 dark:border-red-900/50">
                {cancelMutation.isPending ? (
                  <ActivityIndicator />
                ) : (
                  <Text className="font-semibold text-red-700 dark:text-red-400">Cancel</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : null}

        <Pressable
          onPress={() => setShowEdit((v) => !v)}
          className="mt-6 self-start rounded-full border border-neutral-200 bg-white px-4 py-2 dark:border-neutral-700 dark:bg-neutral-900">
          <Text className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{showEdit ? 'Close editor' : 'Edit details'}</Text>
        </Pressable>

        {showEdit ? (
          <View className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Title</Text>
            <TextInput
              className="mt-1 rounded-xl border border-neutral-200 bg-[#eef2f7] px-3 py-2 text-base text-neutral-900 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
              value={editTitle}
              onChangeText={setEditTitle}
            />
            <Text className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Description
            </Text>
            <TextInput
              className="min-h-[100px] rounded-xl border border-neutral-200 bg-[#eef2f7] px-3 py-2 text-base text-neutral-900 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
              multiline
              textAlignVertical="top"
              value={editDescription}
              onChangeText={setEditDescription}
            />
            <Text className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Budget (PHP)
            </Text>
            <TextInput
              className="rounded-xl border border-neutral-200 bg-[#eef2f7] px-3 py-2 text-base text-neutral-900 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
              keyboardType="decimal-pad"
              value={editBudget}
              onChangeText={setEditBudget}
            />
            <Text className="mb-1 mt-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Location
            </Text>
            <TextInput
              className="rounded-xl border border-neutral-200 bg-[#eef2f7] px-3 py-2 text-base text-neutral-900 dark:border-neutral-600 dark:bg-neutral-950 dark:text-neutral-100"
              value={editLocation}
              onChangeText={setEditLocation}
            />
            <Pressable
              disabled={updateMutation.isPending}
              onPress={() => updateMutation.mutate()}
              className="mt-4 items-center rounded-xl py-3"
              style={{ backgroundColor: BRAND.navy }}>
              {updateMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="font-semibold text-white">Save changes</Text>
              )}
            </Pressable>
          </View>
        ) : null}

        <Text className="mb-2 mt-8 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Saved payment method
        </Text>
        {savedMethodQuery.isPending ? (
          <SkeletonBlock className="h-14 w-full" />
        ) : saved && (saved.last4 || saved.brand) ? (
          <View className="flex-row items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
            <Text className="text-sm text-neutral-800 dark:text-neutral-200">
              {saved.brand ?? 'Card'} ·••• {saved.last4 ?? '----'}
            </Text>
            <Pressable
              disabled={deleteMethodMutation.isPending}
              onPress={() => {
                Alert.alert('Remove saved card', 'Remove this payment method from your account?', [
                  { text: 'No', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => deleteMethodMutation.mutate() },
                ]);
              }}>
              <Text className="text-sm font-semibold text-red-600 dark:text-red-400">Remove</Text>
            </Pressable>
          </View>
        ) : (
          <Text className="text-sm text-neutral-600 dark:text-neutral-400">No saved card on file.</Text>
        )}
      </ScrollView>
    </View>
  );
}
