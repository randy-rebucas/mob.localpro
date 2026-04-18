import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { BRAND } from '@/constants/brand';

export function goBackFromMiniapp() {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/(tabs)');
  }
}

export function MiniappHeaderBackButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={12}
      onPress={goBackFromMiniapp}
      className="ml-0.5 flex-row items-center py-2 pr-3 pl-1 active:opacity-70">
      <MaterialIcons name="arrow-back" size={24} color={BRAND.navy} />
    </Pressable>
  );
}
