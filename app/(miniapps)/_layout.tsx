import { Stack } from 'expo-router';

import { BRAND } from '@/constants/brand';

export default function MiniAppsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
        headerShadowVisible: false,
        headerTintColor: BRAND.navy,
      }}
    />
  );
}
