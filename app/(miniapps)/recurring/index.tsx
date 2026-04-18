import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function RecurringIndexScreen() {
  return (
    <View className="flex-1 bg-neutral-50 p-4 dark:bg-neutral-950">
      <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Recurring services</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/recurring/sample-id' as never)}
        className="mt-8 rounded-2xl border border-neutral-200 bg-white py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <Text className="text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">Open sample schedule</Text>
      </Pressable>
    </View>
  );
}
