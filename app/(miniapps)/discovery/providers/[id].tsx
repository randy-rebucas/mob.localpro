import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

export default function ProviderProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const providerId = typeof id === 'string' ? id : id?.[0] ?? '';

  return (
    <View className="flex-1 bg-[#eef2f7] p-4 dark:bg-neutral-950">
      <Text className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Provider</Text>
      <Text className="mt-2 font-mono text-sm text-neutral-600 dark:text-neutral-400">{providerId}</Text>
    </View>
  );
}
