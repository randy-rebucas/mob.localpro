import { memo } from 'react';
import { View } from 'react-native';

type Props = {
  className?: string;
};

export const SkeletonBlock = memo(function SkeletonBlock({ className }: Props) {
  return <View className={`rounded-xl bg-neutral-200 dark:bg-neutral-700 ${className ?? ''}`} />;
});
