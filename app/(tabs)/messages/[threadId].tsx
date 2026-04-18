import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

export default function ThreadScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const tid = typeof threadId === 'string' ? threadId : threadId?.[0] ?? '';

  return (
    <View className="flex-1 justify-center bg-neutral-50 px-6 dark:bg-neutral-950">
      <Text className="text-center text-base text-neutral-700 dark:text-neutral-300">
        Thread <Text className="font-mono text-brand dark:text-brand-muted">{tid}</Text> — attach SSE stream + optimistic sends via shared `messageService`.
      </Text>
    </View>
  );
}
