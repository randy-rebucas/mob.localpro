import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

export default function JobChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const jobId = typeof id === 'string' ? id : id?.[0] ?? '';

  return (
    <View className="flex-1 justify-center bg-neutral-50 px-6 dark:bg-neutral-950">
      <Text className="text-center text-lg font-semibold text-neutral-900 dark:text-neutral-50">Job chat</Text>
      <Text className="mt-3 text-center text-sm leading-5 text-neutral-600 dark:text-neutral-400">
        Real-time messaging for job <Text className="font-mono text-brand dark:text-brand-muted">{jobId}</Text> is handled by the shared
        messaging service. Wire your SSE `/api/sse/messages` events to `messageService` and this thread UI.
      </Text>
    </View>
  );
}
