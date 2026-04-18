import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function ConsultationsIndexScreen() {
  return (
    <View className="flex-1 bg-neutral-50 p-4 dark:bg-neutral-950">
      <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Consultations</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/consultations/new' as never)}
        className="mt-8 rounded-2xl bg-brand py-4 dark:bg-brand-dark">
        <Text className="text-center text-base font-semibold text-white">Request consultation</Text>
      </Pressable>
    </View>
  );
}
