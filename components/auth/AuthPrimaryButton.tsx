import { ActivityIndicator, Platform, Pressable, Text } from 'react-native';

import { BRAND } from '@/constants/brand';

type Props = {
  title: string;
  loading?: boolean;
  onPress: () => void;
  disabled?: boolean;
  className?: string;
};

export function AuthPrimaryButton({ title, loading, onPress, disabled, className }: Props) {
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={onPress}
      style={{
        backgroundColor: BRAND.navy,
        ...(Platform.OS === 'ios'
          ? {
              shadowColor: BRAND.navy,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.28,
              shadowRadius: 14,
            }
          : { elevation: 5 }),
      }}
      className={`min-h-[52px] flex-row items-center justify-center rounded-2xl active:opacity-90 disabled:opacity-45 ${className ?? ''}`}>
      {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-[16px] font-semibold text-white">{title}</Text>}
    </Pressable>
  );
}
