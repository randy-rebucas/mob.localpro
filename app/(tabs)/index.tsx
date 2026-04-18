import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { type ComponentProps, useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeAnnouncements } from '@/components/home/HomeAnnouncements';
import { HomePromoCarousel } from '@/components/home/HomePromoCarousel';
import { PROMO_BANNERS } from '@/components/home/promoData';
import { announcementService } from '@/core/services/announcementService';
import { loyaltyService } from '@/core/services/loyaltyService';
import { useSessionStore } from '@/core/stores/sessionStore';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

type LauncherItem = {
  label: string;
  icon: IconName;
  to: string;
  accessibilityLabel: string;
};

const LAUNCHER_ITEMS: LauncherItem[] = [
  { label: 'Book Service', icon: 'construction', to: '/jobs/new', accessibilityLabel: 'Book a service, post a new job' },
  { label: 'Find Providers', icon: 'search', to: '/discovery', accessibilityLabel: 'Find providers near you' },
  { label: 'Wallet', icon: 'account-balance-wallet', to: '/wallet', accessibilityLabel: 'Wallet and payments' },
  { label: 'Consultations', icon: 'chat-bubble-outline', to: '/consultations', accessibilityLabel: 'Consultations' },
  { label: 'Recurring', icon: 'autorenew', to: '/recurring', accessibilityLabel: 'Recurring services' },
  { label: 'Rewards', icon: 'card-giftcard', to: '/loyalty', accessibilityLabel: 'Loyalty and rewards' },
  { label: 'Support', icon: 'contact-support', to: '/support', accessibilityLabel: 'Help and support' },
];

function greetingLabel(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatTier(tier: string): string {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const iconMuted = colorScheme === 'dark' ? '#a3a3a3' : '#525252';
  const qc = useQueryClient();
  const user = useSessionStore((s) => s.user);
  const firstName = useMemo(() => {
    if (!user?.displayName) return '';
    return user.displayName.split(/\s+/)[0] ?? '';
  }, [user?.displayName]);

  const announcementsQuery = useQuery({
    queryKey: ['home', 'announcements'],
    queryFn: () => announcementService.list(),
  });

  const loyaltyQuery = useQuery({
    queryKey: ['home', 'loyalty'],
    queryFn: () => loyaltyService.getSummary(),
  });

  const refreshing = announcementsQuery.isRefetching || loyaltyQuery.isRefetching;

  const onRefresh = () => {
    void qc.invalidateQueries({ queryKey: ['home'] });
  };

  return (
    <ScrollView
      className="flex-1 bg-neutral-50 dark:bg-neutral-950"
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 28,
        paddingHorizontal: 0,
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {/* Hero */}
      <View className="px-5">
        <Text className="text-xs font-semibold uppercase tracking-wider text-brand dark:text-brand-muted">
          LocalPro
        </Text>
        <Text className="mt-1 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          {greetingLabel()}
          {firstName ? `, ${firstName}` : ''}
        </Text>
        <Text className="mt-1.5 text-sm leading-5 text-neutral-600 dark:text-neutral-400">
          Book trusted pros, pay safely with escrow, and manage everything in one place.
        </Text>

        {/* Trust strip */}
        <View className="mt-5 flex-row flex-wrap justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-3 py-3 dark:border-neutral-800 dark:bg-neutral-900">
          {[
            { icon: 'badge' as const, t: 'Verified profiles', s: 'KYC-backed providers' },
            { icon: 'lock' as const, t: 'Secure escrow', s: 'Pay when work completes' },
            { icon: 'support-agent' as const, t: 'Local support', s: 'Help when you need it' },
          ].map((cell) => (
            <View key={cell.t} className="min-w-[28%] flex-1">
              <MaterialIcons name={cell.icon} size={20} color="#0d9488" />
              <Text className="mt-1 text-xs font-semibold text-neutral-900 dark:text-neutral-100">{cell.t}</Text>
              <Text className="mt-0.5 text-[10px] leading-4 text-neutral-500 dark:text-neutral-500">{cell.s}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Promotional banners */}
      <View className="mt-8">
        <View className="mb-3 px-5">
          <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Featured for you
          </Text>
        </View>
        <HomePromoCarousel promos={PROMO_BANNERS} />
      </View>

      {/* Loyalty snapshot */}
      <View className="mt-6 px-5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open rewards and loyalty"
          onPressIn={() => void Haptics.selectionAsync()}
          onPress={() => router.push('/loyalty' as never)}
          className="flex-row items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 dark:border-neutral-800 dark:bg-neutral-900">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
              <MaterialIcons name="stars" size={22} color="#d97706" />
            </View>
            <View>
              <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Rewards
              </Text>
              {loyaltyQuery.isPending ? (
                <ActivityIndicator style={{ marginTop: 4 }} size="small" color="#0d9488" />
              ) : (
                <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                  {`${loyaltyQuery.data?.points ?? 0} points · ${formatTier(loyaltyQuery.data?.tier ?? 'bronze')} tier`}
                </Text>
              )}
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={iconMuted} />
        </Pressable>
      </View>

      {/* Quick actions */}
      <View className="mt-8 px-5">
        <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Quick actions
        </Text>
        <View className="mt-3 flex-row gap-2">
          {[
            { label: 'Post job', icon: 'add-circle-outline' as const, to: '/jobs/new' },
            { label: 'Discover', icon: 'explore' as const, to: '/discovery' },
            { label: 'Messages', icon: 'forum' as const, to: '/messages' },
            { label: 'Alerts', icon: 'notifications-none' as const, to: '/notifications' },
          ].map((q) => (
            <Pressable
              key={q.label}
              accessibilityRole="button"
              accessibilityLabel={q.label}
              onPressIn={() => void Haptics.selectionAsync()}
              onPress={() => router.push(q.to as never)}
              className="min-h-[76px] flex-1 items-center justify-center rounded-2xl border border-neutral-200 bg-white py-2.5 dark:border-neutral-800 dark:bg-neutral-900">
              <MaterialIcons name={q.icon} size={22} color="#0d9488" />
              <Text className="mt-1.5 text-center text-[11px] font-semibold text-neutral-800 dark:text-neutral-200">
                {q.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Announcements */}
      <View className="px-5">
        <HomeAnnouncements items={announcementsQuery.data ?? []} />
      </View>

      {/* Services grid */}
      <View className="mt-8 px-5">
        <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          All services
        </Text>
        <Text className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Open any module — same app shell, focused experiences.
        </Text>

        <View className="mt-4 flex-row flex-wrap justify-between gap-y-3">
          {LAUNCHER_ITEMS.map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={item.accessibilityLabel}
              onPressIn={() => void Haptics.selectionAsync()}
              onPress={() => router.push(item.to as never)}
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
      </View>

      {/* Help footer */}
      <View className="mt-10 px-5">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Contact support"
          onPressIn={() => void Haptics.selectionAsync()}
          onPress={() => router.push('/support' as never)}
          className="flex-row items-center justify-between rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-4 dark:border-neutral-700 dark:bg-neutral-900/60">
          <View className="flex-row items-center gap-3">
            <MaterialIcons name="help-outline" size={24} color={iconMuted} />
            <View>
              <Text className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Need help?</Text>
              <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">FAQs, disputes, and live support</Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={iconMuted} />
        </Pressable>
      </View>
    </ScrollView>
  );
}
