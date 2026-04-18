import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { BRAND } from '@/constants/brand';
import { categoryService } from '@/core/services/categoryService';
import { jobService } from '@/core/services/jobService';
import { useToastStore } from '@/core/stores/toastStore';
import { getApiErrorMessage } from '@/core/utils/apiError';

const schema = z.object({
  title: z.string().min(3, 'Title is too short'),
  description: z.string().min(10, 'Add a bit more detail'),
  categoryId: z.string().min(1, 'Choose a category'),
  budget: z.string().optional(),
  location: z.string().optional(),
  tags: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function PostJobScreen() {
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'list'],
    queryFn: () => categoryService.list(),
    staleTime: 86_400_000,
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
      description: '',
      categoryId: '',
      budget: '',
      location: '',
      tags: '',
    },
  });

  const categoryId = watch('categoryId');

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const budgetNum = values.budget ? Number(values.budget.replace(/,/g, '')) : undefined;
      const tags =
        values.tags
          ?.split(',')
          .map((t) => t.trim())
          .filter(Boolean) ?? [];
      return jobService.createJob({
        title: values.title,
        description: values.description,
        categoryId: values.categoryId,
        ...(Number.isFinite(budgetNum) && budgetNum != null && budgetNum > 0 ? { budget: budgetNum } : {}),
        ...(values.location?.trim() ? { location: values.location.trim() } : {}),
        ...(tags.length ? { tags } : {}),
      });
    },
    onSuccess: async (job) => {
      await qc.invalidateQueries({ queryKey: ['jobs', 'list'] });
      showToast('Job posted');
      router.replace(`/jobs/${job.id}` as never);
    },
    onError: (e) => {
      showToast(getApiErrorMessage(e, 'Could not post job'), 'error');
    },
  });

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      className="flex-1 bg-[#eef2f7] px-4 pt-4 dark:bg-neutral-950"
      contentContainerStyle={{ paddingBottom: 32 }}>
      <Text className="text-sm leading-5 text-neutral-600 dark:text-neutral-400">
        Post to the marketplace. Providers will send quotes; you accept one and fund escrow when ready.
      </Text>

      <Text className="mt-6 text-sm font-medium text-neutral-800 dark:text-neutral-200">Category *</Text>
      {categoriesQuery.isPending ? (
        <View className="mt-2 gap-2">
          <SkeletonBlock className="h-10 w-full" />
          <SkeletonBlock className="h-10 w-full" />
        </View>
      ) : categoriesQuery.isError ? (
        <Text className="mt-2 text-sm text-red-600">{getApiErrorMessage(categoriesQuery.error, 'Could not load categories')}</Text>
      ) : (
        <View className="mt-2 flex-row flex-wrap gap-2">
          {(categoriesQuery.data ?? []).map((c) => {
            const selected = categoryId === c.id;
            return (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Category ${c.name}`}
                onPress={() => setValue('categoryId', c.id, { shouldValidate: true })}
                className={`rounded-xl border-2 px-3 py-2 ${
                  selected ? '' : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'
                }`}
                style={selected ? { borderColor: BRAND.navy, backgroundColor: 'rgba(0, 75, 141, 0.1)' } : undefined}>
                <Text
                  className={`text-sm font-medium ${selected ? '' : 'text-neutral-800 dark:text-neutral-200'}`}
                  style={selected ? { color: BRAND.navy } : undefined}>
                  {c.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
      {errors.categoryId ? <Text className="mt-1 text-sm text-red-600">{errors.categoryId.message}</Text> : null}

      <View className="mt-6 gap-2">
        <Text className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Title *</Text>
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              accessibilityLabel="Job title"
              className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              placeholder="e.g. Deep clean 2BR condo"
              placeholderTextColor="#9ca3af"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.title ? <Text className="text-sm text-red-600">{errors.title.message}</Text> : null}
      </View>

      <View className="mt-5 gap-2">
        <Text className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Details *</Text>
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              accessibilityLabel="Job description"
              className="min-h-[120px] rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              placeholder="Scope, timing, access, materials…"
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.description ? <Text className="text-sm text-red-600">{errors.description.message}</Text> : null}
      </View>

      <View className="mt-5 gap-2">
        <Text className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Budget (PHP, optional)</Text>
        <Controller
          control={control}
          name="budget"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              accessibilityLabel="Job budget in pesos"
              keyboardType="decimal-pad"
              className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              placeholder="e.g. 3500"
              placeholderTextColor="#9ca3af"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
      </View>

      <View className="mt-5 gap-2">
        <Text className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Location (optional)</Text>
        <Controller
          control={control}
          name="location"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              placeholder="City / barangay / landmark"
              placeholderTextColor="#9ca3af"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
      </View>

      <View className="mt-5 gap-2">
        <Text className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Tags (optional)</Text>
        <Controller
          control={control}
          name="tags"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              placeholder="Comma-separated, e.g. plumbing, urgent"
              placeholderTextColor="#9ca3af"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Submit job"
        disabled={mutation.isPending || categoriesQuery.isPending}
        onPress={handleSubmit((v) => mutation.mutate(v))}
        className="mt-8 rounded-2xl py-4 opacity-100 disabled:opacity-50 active:opacity-90"
        style={{ backgroundColor: BRAND.navy }}>
        {mutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-center text-base font-semibold text-white">Post job</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
