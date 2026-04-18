import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { z } from 'zod';

import { BRAND } from '@/constants/brand';
import { MiniappHeaderBackButton } from '@/core/navigation/miniappBack';
import { consultationService, type ConsultationType } from '@/core/services/consultationService';
import { useSessionStore } from '@/core/stores/sessionStore';
import { useToastStore } from '@/core/stores/toastStore';
import { getApiErrorMessage } from '@/core/utils/apiError';

const schema = z.object({
  targetUserId: z.string().min(1, "Enter the other party's user id"),
  type: z.enum(['site_inspection', 'chat']),
  title: z.string().min(3, 'Title is too short'),
  description: z.string().min(10, 'Add more detail'),
  location: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function ConsultationNewScreen() {
  const user = useSessionStore((s) => s.user);
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      targetUserId: '',
      type: 'chat',
      title: '',
      description: '',
      location: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      consultationService.create({
        targetUserId: values.targetUserId.trim(),
        type: values.type as ConsultationType,
        title: values.title.trim(),
        description: values.description.trim(),
        ...(values.location?.trim() ? { location: values.location.trim() } : {}),
      }),
    onSuccess: async (created) => {
      await qc.invalidateQueries({ queryKey: ['consultations'] });
      showToast('Consultation created');
      router.replace(`/consultations/${encodeURIComponent(created.id)}` as never);
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Could not create consultation'), 'error'),
  });

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Stack.Screen options={{ title: 'New consultation', headerLeft: () => <MiniappHeaderBackButton /> }} />
        <Text className="text-center text-base text-neutral-700 dark:text-neutral-300">Sign in to request a consultation.</Text>
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
      <Stack.Screen options={{ title: 'New consultation', headerLeft: () => <MiniappHeaderBackButton /> }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        className="flex-1">
        <Text className="mb-4 text-sm leading-5 text-neutral-600 dark:text-neutral-400">
          Enter the user id of the professional (or client) you are contacting, then describe what you need.
        </Text>

        <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Target user id
        </Text>
        <Controller
          control={control}
          name="targetUserId"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              placeholder="User id from profile or directory"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.targetUserId ? (
          <Text className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.targetUserId.message}</Text>
        ) : null}

        <Text className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Type
        </Text>
        <Controller
          control={control}
          name="type"
          render={({ field: { onChange, value } }) => (
            <View className="flex-row gap-2">
              {(['chat', 'site_inspection'] as const).map((t) => (
                <Pressable
                  key={t}
                  onPress={() => onChange(t)}
                  className={`flex-1 rounded-xl border py-2.5 ${
                    value === t ? 'border-transparent' : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'
                  }`}
                  style={value === t ? { backgroundColor: BRAND.navy } : undefined}>
                  <Text
                    className={`text-center text-sm font-semibold ${value === t ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
                    {t === 'chat' ? 'Chat' : 'Site visit'}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        />

        <Text className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Title
        </Text>
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              placeholder="Short summary"
              placeholderTextColor="#9ca3af"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.title ? (
          <Text className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title.message}</Text>
        ) : null}

        <Text className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Description
        </Text>
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              className="min-h-[120px] rounded-xl border border-neutral-200 bg-white px-3 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              placeholder="What do you need help with?"
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              onBlur={onBlur}
              onChangeText={onChange}
              value={value}
            />
          )}
        />
        {errors.description ? (
          <Text className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description.message}</Text>
        ) : null}

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

        <Pressable
          disabled={mutation.isPending}
          onPress={handleSubmit((v) => mutation.mutate(v))}
          className="mt-8 items-center rounded-2xl py-3.5 active:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: BRAND.navy }}>
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-semibold text-white">Submit request</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}
