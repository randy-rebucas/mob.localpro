import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { ChatThreadView } from '@/components/messages/ChatThreadView';
import { useThreadMessageStream } from '@/core/realtime/useThreadMessageStream';

export default function JobChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const jobId = typeof id === 'string' ? id : id?.[0] ?? '';

  useThreadMessageStream(jobId || undefined);

  if (!jobId) {
    return (
      <View className="flex-1 items-center justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Text className="text-center text-base text-neutral-600 dark:text-neutral-400">Missing job id.</Text>
      </View>
    );
  }

  return (
    <ChatThreadView
      threadId={jobId}
      emptyHint="No messages yet. Say hello to the provider to align on timing and details."
    />
  );
}
