import { Stack } from 'expo-router';

export default function ProfileMiniAppLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Profile' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      <Stack.Screen name="addresses" options={{ title: 'Addresses' }} />
    </Stack>
  );
}
