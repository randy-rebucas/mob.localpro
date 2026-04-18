import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';

import { BRAND } from '@/constants/brand';

export type FeatureEmptyStep = { number: string; text: string };

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

export type FeatureEmptyStateProps = {
  icon: MaterialIconName;
  iconSize?: number;
  title: string;
  description?: string;
  steps?: FeatureEmptyStep[];
  /** Shown above numbered steps; default “How to start” when `steps` is set. */
  stepsSectionTitle?: string;
  primaryAction?: { label: string; onPress: () => void; accessibilityLabel?: string };
  secondaryAction?: { label: string; onPress: () => void; accessibilityLabel?: string };
  /**
   * `full` — tall centered block for FlatList empty states.
   * `compact` — less vertical space (e.g. in-thread empty, wallet section).
   */
  variant?: 'full' | 'compact';
};

function IconCircle({ icon, size = 44 }: { icon: MaterialIconName; size?: number }) {
  return (
    <View
      accessible={false}
      pointerEvents="none"
      className="mb-5 h-24 w-24 items-center justify-center rounded-full dark:bg-neutral-800/80"
      style={{ backgroundColor: 'rgba(0, 75, 141, 0.12)' }}>
      <MaterialIcons name={icon} size={size} color={BRAND.navy} importantForAccessibility="no" />
    </View>
  );
}

export function FeatureEmptyState({
  icon,
  iconSize = 44,
  title,
  description,
  steps,
  stepsSectionTitle,
  primaryAction,
  secondaryAction,
  variant = 'full',
}: FeatureEmptyStateProps) {
  const { height } = useWindowDimensions();
  const fullMinHeight = Math.max(340, height * 0.55);
  const stepsTitle = stepsSectionTitle ?? 'How to start';

  return (
    <View
      style={variant === 'full' ? { minHeight: fullMinHeight } : undefined}
      className={variant === 'full' ? 'flex-1 justify-center px-6 pb-8' : 'justify-center px-4 py-6'}>
      <View className="items-center">
        <IconCircle icon={icon} size={iconSize} />
        <Text className="text-center text-lg font-semibold text-neutral-900 dark:text-neutral-50">{title}</Text>
        {description ? (
          <Text className="mt-3 max-w-sm text-center text-sm leading-6 text-neutral-600 dark:text-neutral-400">
            {description}
          </Text>
        ) : null}

        {steps && steps.length > 0 ? (
          <View className="mt-6 w-full max-w-sm rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 dark:border-neutral-800 dark:bg-neutral-900">
            <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              {stepsTitle}
            </Text>
            <View className="mt-3 gap-3">
              {steps.map((step, i) => (
                <View key={`${step.number}-${i}`} className="flex-row gap-3">
                  <View
                    className="mt-0.5 h-6 w-6 items-center justify-center rounded-full"
                    style={{ backgroundColor: 'rgba(0, 75, 141, 0.15)' }}>
                    <Text className="text-xs font-bold" style={{ color: BRAND.navy }}>
                      {step.number}
                    </Text>
                  </View>
                  <Text className="flex-1 text-sm leading-5 text-neutral-700 dark:text-neutral-300">{step.text}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {primaryAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={primaryAction.accessibilityLabel ?? primaryAction.label}
            onPress={primaryAction.onPress}
            className="mt-8 w-full max-w-sm rounded-2xl py-3.5 active:opacity-90"
            style={{ backgroundColor: BRAND.navy }}>
            <Text className="text-center text-base font-semibold text-white">{primaryAction.label}</Text>
          </Pressable>
        ) : null}

        {secondaryAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={secondaryAction.accessibilityLabel ?? secondaryAction.label}
            onPress={secondaryAction.onPress}
            className="mt-3 w-full max-w-sm rounded-2xl border-2 border-neutral-200 bg-white py-3.5 active:opacity-95 dark:border-neutral-700 dark:bg-neutral-900">
            <Text className="text-center text-base font-semibold text-neutral-900 dark:text-neutral-100">
              {secondaryAction.label}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
