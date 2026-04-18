import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useSessionStore } from '@/core/stores/sessionStore';

export default function ProfileHomeScreen() {
  const user = useSessionStore((s) => s.user);

  return (
    <View className="flex-1 bg-neutral-50 p-4 dark:bg-neutral-950">
      <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{user?.displayName ?? 'Guest'}</Text>
      <Text className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{user?.email ?? 'Sign in when your API is ready.'}</Text>

      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/profile/addresses' as never)}
        className="mt-8 rounded-2xl border border-neutral-200 bg-white py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <Text className="text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">Addresses</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push('/profile/settings' as never)}
        className="mt-4 rounded-2xl border border-neutral-200 bg-white py-4 dark:border-neutral-800 dark:bg-neutral-900">
        <Text className="text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">Settings</Text>
      </Pressable>
    </View>
  );
}
