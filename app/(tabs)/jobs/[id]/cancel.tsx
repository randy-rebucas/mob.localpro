import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { jobService } from '@/core/services/jobService';
import { useToastStore } from '@/core/stores/toastStore';
import { getApiErrorMessage } from '@/core/utils/apiError';

const schema = z.object({
  reason: z.string().min(5, 'Please give at least 5 characters'),
});

type FormValues = z.infer<typeof schema>;

export default function JobCancelScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const jobId = typeof id === 'string' ? id : id?.[0] ?? '';
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => jobService.cancelJob(jobId, values.reason),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['jobs', 'list'] });
      await qc.invalidateQueries({ queryKey: ['jobs', 'detail', jobId] });
      showToast('Job cancelled');
      router.replace(`/jobs/${jobId}` as never);
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Could not cancel job'), 'error'),
  });

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      className="flex-1 bg-[#eef2f7] px-4 pt-4 dark:bg-neutral-950"
      contentContainerStyle={{ paddingBottom: 32 }}>
      <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">Cancel this job</Text>
      <Text className="mt-2 text-sm leading-5 text-neutral-600 dark:text-neutral-400">
        Allowed when the job is open or assigned. If escrow was funded, it will be refunded per platform rules.
      </Text>

      <View className="mt-6 gap-2">
        <Text className="text-sm font-medium text-neutral-800 dark:text-neutral-200">Reason *</Text>
        <Controller
          control={control}
          name="reason"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              accessibilityLabel="Cancellation reason"
              className="min-h-[100px] rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              placeholder="Why are you cancelling?"
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.reason ? <Text className="text-sm text-red-600">{errors.reason.message}</Text> : null}
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={mutation.isPending}
        onPress={handleSubmit((v) => mutation.mutate(v))}
        className="mt-8 rounded-2xl bg-red-600 py-4 disabled:opacity-50">
        {mutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-center text-base font-semibold text-white">Confirm cancellation</Text>
        )}
      </Pressable>

      <Pressable accessibilityRole="button" onPress={() => router.back()} className="mt-4 py-3">
        <Text className="text-center text-sm font-semibold text-neutral-600 dark:text-neutral-400">Go back</Text>
      </Pressable>
    </ScrollView>
  );
}
