import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

export default function RecurringDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const rid = typeof id === 'string' ? id : id?.[0] ?? '';

  return (
    <View className="flex-1 bg-neutral-50 p-4 dark:bg-neutral-950">
      <Text className="text-neutral-900 dark:text-neutral-50">Pause / resume controls for schedule {rid}</Text>
    </View>
  );
}
