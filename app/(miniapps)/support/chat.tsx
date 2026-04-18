import { Stack, router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { SupportChatView } from '@/components/messages/SupportChatView';
import { BRAND } from '@/constants/brand';
import { MiniappHeaderBackButton } from '@/core/navigation/miniappBack';
import { useSupportMessageStream } from '@/core/realtime/useSupportMessageStream';
import { useSessionStore } from '@/core/stores/sessionStore';

export default function SupportChatScreen() {
  const user = useSessionStore((s) => s.user);
  useSupportMessageStream(!!user);

  if (!user) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Stack.Screen
          options={{
            title: 'Support chat',
            headerLeft: () => <MiniappHeaderBackButton />,
          }}
        />
        <Text className="text-center text-base text-neutral-700 dark:text-neutral-300">Sign in to message support.</Text>
        <Pressable
          onPress={() => router.push('/login')}
          className="mt-6 self-center rounded-2xl px-6 py-3 active:opacity-90"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">Sign in</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
      <Stack.Screen
        options={{
          title: 'Support chat',
          headerLeft: () => <MiniappHeaderBackButton />,
        }}
      />
      <SupportChatView emptyHint="Describe your issue and our team will reply here. Replies may take a little time during busy periods." />
    </View>
  );
}
