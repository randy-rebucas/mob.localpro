import { Stack } from 'expo-router';

export default function JobDetailLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Job' }} />
      <Stack.Screen name="quotes" options={{ title: 'Quotes' }} />
      <Stack.Screen name="chat" options={{ title: 'Chat' }} />
      <Stack.Screen name="review" options={{ title: 'Review' }} />
    </Stack>
  );
}
