import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState';
import { BRAND } from '@/constants/brand';
import { supportService } from '@/core/services/supportService';
import { useToastStore } from '@/core/stores/toastStore';
import type { ChatMessage } from '@/core/types/models';
import { getApiErrorMessage } from '@/core/utils/apiError';

type Props = {
  /** Shown when the thread has no messages yet. */
  emptyHint: string;
};

export function SupportChatView({ emptyHint }: Props) {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);
  const [draft, setDraft] = useState('');

  const query = useQuery({
    queryKey: ['support', 'thread'],
    queryFn: () => supportService.listThread(),
  });

  const sendMutation = useMutation({
    mutationFn: (body: string) => supportService.postMessage(body),
    onSuccess: async () => {
      setDraft('');
      await qc.invalidateQueries({ queryKey: ['support', 'thread'] });
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Message not sent'), 'error'),
  });

  const onSend = useCallback(() => {
    const t = draft.trim();
    if (!t) return;
    sendMutation.mutate(t);
  }, [draft, sendMutation]);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <View className="mx-4 mb-3 rounded-2xl border border-neutral-200 bg-white px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
        {item.senderLabel ? (
          <Text className="text-xs font-semibold dark:text-sky-300" style={{ color: BRAND.navy }}>
            {item.senderLabel}
          </Text>
        ) : null}
        <Text className="mt-1 text-sm leading-5 text-neutral-800 dark:text-neutral-200">{item.body}</Text>
        <Text className="mt-1 text-[10px] text-neutral-400">
          {new Date(item.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </Text>
      </View>
    ),
    []
  );

  if (query.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-[#eef2f7] dark:bg-neutral-950">
        <ActivityIndicator color={BRAND.navy} />
      </View>
    );
  }

  if (query.isError) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Text className="text-center text-base font-semibold text-neutral-900 dark:text-neutral-100">
          Couldn&apos;t load support chat
        </Text>
        <Text className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">{getApiErrorMessage(query.error)}</Text>
        <Pressable
          onPress={() => void query.refetch()}
          className="mt-6 self-center rounded-2xl px-6 py-3 active:opacity-90"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  const messages = [...(query.data ?? [])].reverse();

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-[#eef2f7] dark:bg-neutral-950"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}>
      <FlatList
        data={messages}
        inverted
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 8 }}
        renderItem={renderItem}
        ListEmptyComponent={
          <FeatureEmptyState
            variant="compact"
            icon="support-agent"
            title="No messages yet"
            description={emptyHint}
          />
        }
      />
      <View
        className="border-t border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900"
        style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
        <View className="flex-row items-end gap-2">
          <TextInput
            accessibilityLabel="Message to support"
            className="max-h-28 min-h-[44px] flex-1 rounded-xl border border-neutral-200 px-3 py-2.5 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50"
            placeholder="Message the support team"
            placeholderTextColor="#9ca3af"
            multiline
            value={draft}
            onChangeText={setDraft}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            disabled={sendMutation.isPending || !draft.trim()}
            onPress={onSend}
            className="mb-0.5 h-11 w-11 items-center justify-center rounded-full disabled:opacity-40 active:opacity-90"
            style={{ backgroundColor: BRAND.navy }}>
            {sendMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <MaterialIcons name="send" size={20} color="#ffffff" />
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
