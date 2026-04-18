import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

export default function ConsultationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const cid = typeof id === 'string' ? id : id?.[0] ?? '';

  return (
    <View className="flex-1 bg-neutral-50 p-4 dark:bg-neutral-950">
      <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Consultation</Text>
      <Text className="mt-2 font-mono text-sm text-neutral-600 dark:text-neutral-400">{cid}</Text>
    </View>
  );
}
