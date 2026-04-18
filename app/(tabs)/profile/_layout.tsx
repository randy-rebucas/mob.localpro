import { Stack } from 'expo-router';

export default function ProfileStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: 'Profile' }} />
      <Stack.Screen name="addresses" options={{ title: 'Addresses' }} />
      <Stack.Screen name="address-form" options={{ title: 'Address' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}
