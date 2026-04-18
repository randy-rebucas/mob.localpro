import { Stack } from 'expo-router';

import { BRAND } from '@/constants/brand';

export default function JobDetailLayout() {
  return (
    <Stack screenOptions={{ headerShadowVisible: false, headerTintColor: BRAND.navy }}>
      <Stack.Screen name="index" options={{ title: 'Job' }} />
      <Stack.Screen name="quotes" options={{ title: 'Quotes' }} />
      <Stack.Screen name="chat" options={{ title: 'Chat' }} />
      <Stack.Screen name="review" options={{ title: 'Review' }} />
      <Stack.Screen name="cancel" options={{ title: 'Cancel job' }} />
    </Stack>
  );
}
