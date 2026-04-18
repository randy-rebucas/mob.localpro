import { Stack } from 'expo-router';

import { BRAND } from '@/constants/brand';

export default function JobsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerTintColor: BRAND.navy,
      }}>
      <Stack.Screen name="index" options={{ title: 'Jobs' }} />
      <Stack.Screen name="new" options={{ title: 'Post job' }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
