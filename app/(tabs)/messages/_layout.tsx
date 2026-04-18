import { Stack } from 'expo-router';

export default function MessagesMiniAppLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Messages' }} />
      <Stack.Screen name="[threadId]" options={{ title: 'Chat' }} />
    </Stack>
  );
}
