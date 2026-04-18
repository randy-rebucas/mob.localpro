import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function DiscoveryIndexScreen() {
  return (
    <View className="flex-1 bg-neutral-50 p-4 dark:bg-neutral-950">
      <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Search providers</Text>
      <Text className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">Filters and list UI connect to discovery APIs. Map uses Expo Location + React Native Maps.</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/discovery/map' as never)}
        className="mt-8 rounded-2xl bg-brand py-4 dark:bg-brand-dark">
        <Text className="text-center text-base font-semibold text-white">Open map view</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/discovery/providers/demo-provider' as never)}
        className="mt-4 rounded-2xl border border-neutral-200 bg-white py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <Text className="text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">Sample provider profile</Text>
      </Pressable>
    </View>
  );
}
