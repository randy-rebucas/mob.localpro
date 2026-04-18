import { Stack, router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { BRAND } from '@/constants/brand';
import { MiniappHeaderBackButton } from '@/core/navigation/miniappBack';

/**
 * `react-native-maps` is not supported on Expo web; native builds use `./map.tsx`.
 */
export default function DiscoveryMapWebScreen() {
  return (
    <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
      <Stack.Screen options={{ title: 'Map', headerLeft: () => <MiniappHeaderBackButton /> }} />
      <Text className="text-center text-base leading-6 text-neutral-700 dark:text-neutral-300">
        The provider map runs on iOS and Android. Use the list view on web to browse providers.
      </Text>
      <Pressable
        onPress={() => router.push('/discovery' as never)}
        className="mt-6 self-center rounded-2xl px-6 py-3 active:opacity-90"
        style={{ backgroundColor: BRAND.navy }}>
        <Text className="font-semibold text-white">Open provider list</Text>
      </Pressable>
    </View>
  );
}
