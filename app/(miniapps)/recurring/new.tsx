import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { z } from 'zod';

import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { BRAND } from '@/constants/brand';
import { MiniappHeaderBackButton } from '@/core/navigation/miniappBack';
import { categoryService } from '@/core/services/categoryService';
import { recurringService, type RecurringFrequency } from '@/core/services/recurringService';
import { useSessionStore } from '@/core/stores/sessionStore';
import { useToastStore } from '@/core/stores/toastStore';
import { getApiErrorMessage } from '@/core/utils/apiError';

const schema = z.object({
  title: z.string().min(3, 'Title is too short'),
  category: z.string().min(1, 'Choose a category'),
  description: z.string().min(20, 'Use at least 20 characters'),
  budget: z.string().optional(),
  location: z.string().optional(),
  frequency: z.enum(['weekly', 'monthly']),
  scheduleDate: z.string().min(8, 'Use YYYY-MM-DD'),
  autoPayEnabled: z.boolean(),
  specialInstructions: z.string().optional(),
  maxRuns: z.string().optional(),
  providerId: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function RecurringNewScreen() {
  const user = useSessionStore((s) => s.user);
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'list'],
    queryFn: () => categoryService.list(),
    enabled: !!user,
    staleTime: 86_400_000,
  });

  const pastProvidersQuery = useQuery({
    queryKey: ['recurring', 'pastProviders'],
    queryFn: () => recurringService.listPastProviders(),
    enabled: !!user,
    staleTime: 60_000,
  });

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      category: '',
      description: '',
      budget: '',
      location: '',
      frequency: 'monthly',
      scheduleDate: '',
      autoPayEnabled: false,
      specialInstructions: '',
      maxRuns: '',
      providerId: '',
    },
  });

  const categoryId = watch('category');
  const selectedProviderId = watch('providerId');

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const budgetNum = values.budget?.trim() ? Number(values.budget.replace(/,/g, '')) : undefined;
      const maxRunsNum = values.maxRuns?.trim() ? Number(values.maxRuns.replace(/,/g, '')) : undefined;
      return recurringService.create({
        title: values.title.trim(),
        category: values.category.trim(),
        description: values.description.trim(),
        frequency: values.frequency as RecurringFrequency,
        scheduleDate: values.scheduleDate.trim(),
        autoPayEnabled: values.autoPayEnabled,
        ...(Number.isFinite(budgetNum) && budgetNum != null && budgetNum > 0 ? { budget: budgetNum } : {}),
        ...(values.location?.trim() ? { location: values.location.trim() } : {}),
        ...(values.specialInstructions?.trim() ? { specialInstructions: values.specialInstructions.trim() } : {}),
        ...(Number.isFinite(maxRunsNum) && maxRunsNum != null && maxRunsNum > 0 ? { maxRuns: maxRunsNum } : {}),
        ...(values.providerId?.trim() ? { providerId: values.providerId.trim() } : {}),
      });
    },
    onSuccess: async (created) => {
      await qc.invalidateQueries({ queryKey: ['recurring'] });
      showToast('Schedule created');
      router.replace(`/recurring/${encodeURIComponent(created.id)}` as never);
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Could not create schedule'), 'error'),
  });

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Stack.Screen options={{ title: 'New schedule', headerLeft: () => <MiniappHeaderBackButton /> }} />
        <Text className="text-center text-base text-neutral-700 dark:text-neutral-300">Sign in to create a recurring schedule.</Text>
        <Pressable
          onPress={() => router.push('/login')}
          className="mt-6 rounded-2xl px-6 py-3 active:opacity-90"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">Sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
      <Stack.Screen options={{ title: 'New schedule', headerLeft: () => <MiniappHeaderBackButton /> }} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text className="mb-4 text-sm leading-5 text-neutral-600 dark:text-neutral-400">
          Repeat a service on a cadence you choose. You can pause or cancel from the schedule detail.
        </Text>

        {pastProvidersQuery.data && pastProvidersQuery.data.length > 0 ? (
          <View className="mb-4">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Past providers (optional)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
              <Pressable
                onPress={() => setValue('providerId', '')}
                className={`mr-2 rounded-full border px-3 py-1.5 ${
                  !selectedProviderId ? 'border-transparent' : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'
                }`}
                style={!selectedProviderId ? { backgroundColor: BRAND.navy } : undefined}>
                <Text className={`text-xs font-semibold ${!selectedProviderId ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
                  Any provider
                </Text>
              </Pressable>
              {pastProvidersQuery.data.map((p) => {
                const selected = selectedProviderId === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setValue('providerId', p.id)}
                    className={`mr-2 max-w-[200px] rounded-full border px-3 py-1.5 ${
                      selected ? 'border-transparent' : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'
                    }`}
                    style={selected ? { backgroundColor: BRAND.navy } : undefined}>
                    <Text
                      numberOfLines={1}
                      className={`text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
                      {p.displayName}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Category</Text>
        {categoriesQuery.isPending ? (
          <SkeletonBlock className="h-12 w-full" />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2 -mx-1">
            {(categoriesQuery.data ?? []).map((c) => {
              const selected = categoryId === c.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => setValue('category', c.id, { shouldValidate: true })}
                  className={`mr-2 rounded-full border px-3 py-1.5 ${
                    selected ? 'border-transparent' : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'
                  }`}
                  style={selected ? { backgroundColor: BRAND.navy } : undefined}>
                  <Text className={`text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
        {errors.category ? (
          <Text className="mb-2 text-sm text-red-600 dark:text-red-400">{errors.category.message}</Text>
        ) : null}

        <Text className="mb-1 mt-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Title</Text>
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              placeholder="e.g. Monthly AC cleaning"
              placeholderTextColor="#9ca3af"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.title ? <Text className="mt-1 text-sm text-red-600">{errors.title.message}</Text> : null}

        <Text className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Frequency</Text>
        <Controller
          control={control}
          name="frequency"
          render={({ field: { onChange, value } }) => (
            <View className="flex-row gap-2">
              {(['weekly', 'monthly'] as const).map((f) => (
                <Pressable
                  key={f}
                  onPress={() => onChange(f)}
                  className={`flex-1 rounded-xl border py-2.5 ${
                    value === f ? 'border-transparent' : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'
                  }`}
                  style={value === f ? { backgroundColor: BRAND.navy } : undefined}>
                  <Text
                    className={`text-center text-sm font-semibold capitalize ${value === f ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
                    {f}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        />

        <Text className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          First run date (YYYY-MM-DD)
        </Text>
        <Controller
          control={control}
          name="scheduleDate"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              placeholder="2026-05-01"
              placeholderTextColor="#9ca3af"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.scheduleDate ? <Text className="mt-1 text-sm text-red-600">{errors.scheduleDate.message}</Text> : null}

        <Text className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Description</Text>
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="min-h-[120px] rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              placeholder="What should happen each visit?"
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.description ? <Text className="mt-1 text-sm text-red-600">{errors.description.message}</Text> : null}

        <Text className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Budget (PHP, optional)
        </Text>
        <Controller
          control={control}
          name="budget"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              placeholder="500"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />

        <Text className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Location (optional)
        </Text>
        <Controller
          control={control}
          name="location"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              placeholder="City or address"
              placeholderTextColor="#9ca3af"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />

        <Text className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Max runs (optional)
        </Text>
        <Controller
          control={control}
          name="maxRuns"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              placeholder="12"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />

        <Text className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Special instructions (optional)
        </Text>
        <Controller
          control={control}
          name="specialInstructions"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="min-h-[72px] rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              placeholder="Access codes, pets, materials…"
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />

        <View className="mt-4 flex-row items-center justify-between rounded-xl border border-neutral-200 bg-white px-3 py-3 dark:border-neutral-700 dark:bg-neutral-900">
          <Text className="flex-1 pr-2 text-sm font-medium text-neutral-800 dark:text-neutral-200">Auto-pay when billed</Text>
          <Controller
            control={control}
            name="autoPayEnabled"
            render={({ field: { onChange, value } }) => (
              <Switch value={value} onValueChange={onChange} trackColor={{ true: BRAND.navy, false: '#d4d4d4' }} />
            )}
          />
        </View>

        <Pressable
          disabled={mutation.isPending}
          onPress={handleSubmit((v) => mutation.mutate(v))}
          className="mt-8 items-center rounded-2xl py-3.5 active:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: BRAND.navy }}>
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-semibold text-white">Create schedule</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}
