import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, Pressable, Text, useWindowDimensions, View } from 'react-native';

import type { PromoBanner } from '@/components/home/promoData';

type Props = {
  promos: PromoBanner[];
  gap?: number;
};

export function HomePromoCarousel({ promos, gap = 12 }: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const horizontalPad = 20;
  const cardWidth = windowWidth - horizontalPad * 2;
  const step = cardWidth + gap;
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.round(x / step);
    setIndex(Math.min(Math.max(0, next), promos.length - 1));
  };

  return (
    <View>
      <FlatList
        ref={listRef}
        data={promos}
        keyExtractor={(p) => p.id}
        horizontal
        decelerationRate="fast"
        snapToInterval={step}
        snapToAlignment="start"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: horizontalPad }}
        ItemSeparatorComponent={() => <View style={{ width: gap }} />}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, i) => ({
          length: step,
          offset: step * i,
          index: i,
        })}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${item.title}. ${item.subtitle}`}
            onPressIn={() => void Haptics.selectionAsync()}
            onPress={() => router.push(item.href as never)}
            style={{ width: cardWidth }}
            className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-neutral-900">
            <View className="flex-row">
              <View className={`w-1.5 ${item.accentClass}`} />
              <View className="flex-1 flex-row items-center px-4 py-4">
                <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <MaterialIcons name={item.icon} size={26} color="#0d9488" />
                </View>
                <View className="min-w-0 flex-1 pr-1">
                  <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text className="mt-1 text-sm leading-5 text-neutral-600 dark:text-neutral-400" numberOfLines={2}>
                    {item.subtitle}
                  </Text>
                  <View className="mt-2 flex-row items-center gap-1">
                    <Text className="text-sm font-semibold text-brand dark:text-brand-muted">{item.cta}</Text>
                    <MaterialIcons name="arrow-forward" size={16} color="#0d9488" />
                  </View>
                </View>
              </View>
            </View>
          </Pressable>
        )}
      />
      <View className="mt-3 flex-row justify-center gap-1.5">
        {promos.map((_, i) => (
          <View
            key={i}
            className={`h-1.5 rounded-full ${i === index ? 'w-5 bg-brand dark:bg-brand-muted' : 'w-1.5 bg-neutral-300 dark:bg-neutral-600'}`}
          />
        ))}
      </View>
    </View>
  );
}
