import { useEffect } from 'react';
import { Pressable, Text } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useToastStore } from '@/core/stores/toastStore';

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const queue = useToastStore((s) => s.queue);
  const dismiss = useToastStore((s) => s.dismiss);
  const translateY = useSharedValue(100);
  const active = queue[0];

  useEffect(() => {
    translateY.value = active ? withSpring(0) : withSpring(100);
  }, [active, translateY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!active) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: insets.bottom + 12,
          zIndex: 50,
        },
        style,
      ]}>
      <Pressable
        accessibilityRole="alert"
        onPress={() => dismiss(active.id)}
        className={`rounded-2xl px-4 py-3 shadow-lg ${active.variant === 'error' ? 'bg-red-700' : 'bg-neutral-900'}`}>
        <Text className="text-center text-sm font-medium text-white">{active.message}</Text>
      </Pressable>
    </Animated.View>
  );
}
