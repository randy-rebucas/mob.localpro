import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { z } from 'zod';

import { BRAND } from '@/constants/brand';
import { MiniappHeaderBackButton } from '@/core/navigation/miniappBack';
import { supportService, type CreateSupportTicketInput } from '@/core/services/supportService';
import { useSessionStore } from '@/core/stores/sessionStore';
import { useToastStore } from '@/core/stores/toastStore';
import { getApiErrorMessage } from '@/core/utils/apiError';

const CATEGORIES: CreateSupportTicketInput['category'][] = [
  'billing',
  'account',
  'dispute',
  'technical',
  'kyc',
  'payout',
  'other',
];

const schema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(255),
  body: z.string().min(10, 'Details must be at least 10 characters').max(5000),
  category: z.enum([
    'billing',
    'account',
    'dispute',
    'technical',
    'kyc',
    'payout',
    'other',
  ]),
});

type FormValues = z.infer<typeof schema>;

export default function SupportTicketNewScreen() {
  const insets = useSafeAreaInsets();
  const user = useSessionStore((s) => s.user);
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { subject: '', body: '', category: 'other' },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => supportService.createTicket(values),
    onSuccess: async (ticket) => {
      await qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
      showToast('Ticket created');
      router.replace(`/support/ticket/${ticket.id}` as never);
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Could not create ticket'), 'error'),
  });

  if (!user) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Stack.Screen
          options={{
            title: 'New ticket',
            headerLeft: () => <MiniappHeaderBackButton />,
          }}
        />
        <Text className="text-center text-base text-neutral-700 dark:text-neutral-300">Sign in to open a ticket.</Text>
        <Pressable
          onPress={() => router.push('/login')}
          className="mt-6 self-center rounded-2xl px-6 py-3 active:opacity-90"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">Sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
      <Stack.Screen
        options={{
          title: 'New ticket',
          headerLeft: () => <MiniappHeaderBackButton />,
        }}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
        <Text className="text-sm text-neutral-600 dark:text-neutral-400">
          Choose a category and describe the issue. Include dates, job titles, or payment references when relevant.
        </Text>

        <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Category
        </Text>
        <Controller
          control={control}
          name="category"
          render={({ field: { value, onChange } }) => (
            <View className="flex-row flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const selected = value === c;
                return (
                  <Pressable
                    key={c}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => onChange(c)}
                    className={`rounded-full border px-3 py-2 active:opacity-90 ${
                      selected ? 'border-transparent' : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'
                    }`}
                    style={selected ? { backgroundColor: BRAND.navy } : undefined}>
                    <Text
                      className={`text-xs font-medium capitalize ${selected ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
                      {c.replace(/_/g, ' ')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        />
        {errors.category ? (
          <Text className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category.message}</Text>
        ) : null}

        <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Subject
        </Text>
        <Controller
          control={control}
          name="subject"
          render={({ field: { value, onChange } }) => (
            <TextInput
              className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              placeholder="Short summary"
              placeholderTextColor="#9ca3af"
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        {errors.subject ? (
          <Text className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.subject.message}</Text>
        ) : null}

        <Text className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Details
        </Text>
        <Controller
          control={control}
          name="body"
          render={({ field: { value, onChange } }) => (
            <TextInput
              className="min-h-[140px] rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base leading-6 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              placeholder="What happened? What do you need from us?"
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              value={value}
              onChangeText={onChange}
            />
          )}
        />
        {errors.body ? (
          <Text className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.body.message}</Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Submit support ticket"
          disabled={mutation.isPending}
          onPress={handleSubmit((v) => mutation.mutate(v))}
          className="mt-8 items-center rounded-2xl py-3.5 active:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">{mutation.isPending ? 'Submitting…' : 'Submit ticket'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
