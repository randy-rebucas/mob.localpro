import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, ScrollView, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BRAND } from '@/constants/brand';
import { SERVICE_LAUNCHER_ITEMS } from '@/constants/serviceLauncherItems';
import { useSessionStore } from '@/core/stores/sessionStore';

/** Paths that require a session before navigation (same rules as home). */
function requiresSignInForPath(path: string): boolean {
  const base = path.split('?')[0] ?? path;
  const prefixes = [
    '/discovery',
    '/consultations',
    '/recurring',
    '/loyalty',
    '/support',
    '/notifications',
    '/wallet',
    '/messages',
    '/profile',
  ];
  for (const p of prefixes) {
    if (base === p || base.startsWith(`${p}/`)) return true;
  }
  if (base.startsWith('/jobs/new')) return true;
  return false;
}

export default function AllServicesScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const iconMuted = colorScheme === 'dark' ? '#a3a3a3' : '#525252';
  const user = useSessionStore((s) => s.user);

  const goOrSignIn = useCallback(
    (to: string) => {
      if (!user && requiresSignInForPath(to)) {
        router.push('/login');
        return;
      }
      router.push(to as never);
    },
    [user]
  );

  return (
    <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
      <View
        className="border-b border-neutral-200 bg-white px-4 pb-3 dark:border-neutral-800 dark:bg-neutral-900"
        style={{ paddingTop: Math.max(insets.top, 12) }}>
        <View className="flex-row items-center gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={12}
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-100 dark:active:bg-neutral-800">
            <MaterialIcons name="arrow-back" size={24} color={BRAND.navy} />
          </Pressable>
          <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">All services</Text>
        </View>
        <Text className="mt-1 pl-[52px] text-sm text-neutral-600 dark:text-neutral-400">
          Open any module — same app shell, focused experiences.
        </Text>
      </View>

      <ScrollView
        className="flex-1 bg-[#eef2f7] dark:bg-neutral-950"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: insets.bottom + 24,
        }}>
        <View className="flex-row flex-wrap justify-between gap-y-3">
          {SERVICE_LAUNCHER_ITEMS.map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={item.accessibilityLabel}
              onPressIn={() => void Haptics.selectionAsync()}
              onPress={() => goOrSignIn(item.to)}
              className="w-[31%] items-center rounded-2xl border border-neutral-200 bg-white py-3.5 dark:border-neutral-800 dark:bg-neutral-900">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800">
                <MaterialIcons name={item.icon} size={22} color={iconMuted} />
              </View>
              <Text className="mt-2 px-1 text-center text-[11px] font-semibold leading-4 text-neutral-800 dark:text-neutral-200">
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
