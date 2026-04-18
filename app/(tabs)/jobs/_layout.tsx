import { Stack } from 'expo-router';

export default function JobsMiniAppLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Jobs' }} />
      <Stack.Screen name="new" options={{ title: 'Post job' }} />
      <Stack.Screen name="[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
