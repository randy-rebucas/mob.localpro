import { Stack } from 'expo-router';

import { BRAND } from '@/constants/brand';

export default function MessagesMiniAppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerTintColor: BRAND.navy,
      }}>
      <Stack.Screen name="index" options={{ title: 'Messages' }} />
      <Stack.Screen name="[threadId]" options={{ title: 'Chat' }} />
    </Stack>
  );
}
