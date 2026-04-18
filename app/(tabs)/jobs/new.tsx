import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { jobService } from '@/core/services/jobService';
import { useToastStore } from '@/core/stores/toastStore';

const schema = z.object({
  title: z.string().min(3, 'Title is too short'),
  description: z.string().min(10, 'Add a bit more detail'),
  budgetMin: z.string().optional(),
  budgetMax: z.string().optional(),
  locationLabel: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function PostJobScreen() {
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      budgetMin: '',
      budgetMax: '',
      locationLabel: '',
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const budgetMin = values.budgetMin ? Number(values.budgetMin) : undefined;
      const budgetMax = values.budgetMax ? Number(values.budgetMax) : undefined;
      return jobService.createJob({
        title: values.title,
        description: values.description,
        budgetMin: Number.isFinite(budgetMin) ? budgetMin : undefined,
        budgetMax: Number.isFinite(budgetMax) ? budgetMax : undefined,
        locationLabel: values.locationLabel || undefined,
      });
    },
    onSuccess: async (job) => {
      await qc.invalidateQueries({ queryKey: ['jobs', 'list'] });
      showToast('Job posted');
      router.replace(`/jobs/${job.id}` as never);
    },
    onError: () => {
      showToast('Could not post job', 'error');
    },
  });

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      className="flex-1 bg-neutral-50 px-4 pt-4 dark:bg-neutral-950"
      contentContainerStyle={{ paddingBottom: 32 }}>
      <Text className="text-sm text-neutral-600 dark:text-neutral-400">Describe what you need — providers will send quotes.</Text>

      <View className="mt-6 gap-2">
        <Text className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Title</Text>
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
        <Text className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Details</Text>
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              accessibilityLabel="Job description"
              className="min-h-[120px] rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              placeholder="Scope, timing, materials…"
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

      <View className="mt-5 flex-row gap-3">
        <View className="flex-1 gap-2">
          <Text className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Budget min (PHP)</Text>
          <Controller
            control={control}
            name="budgetMin"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                keyboardType="numeric"
                className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </View>
        <View className="flex-1 gap-2">
          <Text className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Budget max (PHP)</Text>
          <Controller
            control={control}
            name="budgetMax"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                keyboardType="numeric"
                className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </View>
      </View>

      <View className="mt-5 gap-2">
        <Text className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Location (optional)</Text>
        <Controller
          control={control}
          name="locationLabel"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              placeholder="City / barangay"
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
        disabled={mutation.isPending}
        onPress={handleSubmit((v) => mutation.mutate(v))}
        className="mt-8 rounded-2xl bg-brand py-4 opacity-100 disabled:opacity-50 dark:bg-brand-dark">
        <Text className="text-center text-base font-semibold text-white">{mutation.isPending ? 'Posting…' : 'Post job'}</Text>
      </Pressable>
    </ScrollView>
  );
}
