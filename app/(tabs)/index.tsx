import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type LauncherItem = {
  label: string;
  icon: string;
  to: string;
  accessibilityLabel: string;
};

const LAUNCHER_ITEMS: LauncherItem[] = [
  { label: 'Book Service', icon: '🛠️', to: '/jobs/new', accessibilityLabel: 'Book a service, post a new job' },
  { label: 'Find Providers', icon: '🔎', to: '/discovery', accessibilityLabel: 'Find providers near you' },
  { label: 'Wallet', icon: '💳', to: '/wallet', accessibilityLabel: 'Wallet and payments' },
  { label: 'Consultations', icon: '💬', to: '/consultations', accessibilityLabel: 'Consultations' },
  { label: 'Recurring', icon: '🔁', to: '/recurring', accessibilityLabel: 'Recurring services' },
  { label: 'Rewards', icon: '🎁', to: '/loyalty', accessibilityLabel: 'Loyalty and rewards' },
  { label: 'Support', icon: '🛟', to: '/support', accessibilityLabel: 'Help and support' },
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-neutral-50 dark:bg-neutral-950"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24, paddingHorizontal: 20 }}>
      <Text className="text-3xl font-bold text-neutral-900 dark:text-neutral-50">LocalPro</Text>
      <Text className="mt-1 text-base text-neutral-600 dark:text-neutral-400">B2B2C marketplace for the Philippines</Text>

      <View className="mt-8 rounded-3xl bg-white p-5 shadow-sm dark:bg-neutral-900">
        <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">Mini app launcher</Text>
        <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Open any module — same shell, isolated features.</Text>

        <View className="mt-6 flex-row flex-wrap justify-between gap-y-4">
          {LAUNCHER_ITEMS.map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={item.accessibilityLabel}
              onPressIn={() => {
                void Haptics.selectionAsync();
              }}
              onPress={() => {
                router.push(item.to as never);
              }}
              className="w-[30%] items-center rounded-2xl bg-neutral-100 py-4 dark:bg-neutral-800">
              <Text className="text-2xl">{item.icon}</Text>
              <Text className="mt-2 text-center text-xs font-medium text-neutral-800 dark:text-neutral-200">{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open notifications"
        onPressIn={() => {
          void Haptics.selectionAsync();
        }}
        onPress={() => {
          router.push('/notifications' as never);
        }}
        className="mt-6 flex-row items-center justify-between rounded-2xl bg-brand px-4 py-4 dark:bg-brand-dark">
        <Text className="text-base font-semibold text-white">Notifications</Text>
        <Text className="text-white">→</Text>
      </Pressable>
    </ScrollView>
  );
}
