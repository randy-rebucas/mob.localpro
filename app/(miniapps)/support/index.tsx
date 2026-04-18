import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import type { ComponentProps } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';

import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState';
import { BRAND } from '@/constants/brand';
import { MiniappHeaderBackButton } from '@/core/navigation/miniappBack';
import { supportService } from '@/core/services/supportService';
import { useSessionStore } from '@/core/stores/sessionStore';

type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];

function HubRow({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: MaterialIconName;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
      onPress={onPress}
      className="mx-4 mb-3 flex-row items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 active:opacity-95 dark:border-neutral-800 dark:bg-neutral-900">
      <View
        className="h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: 'rgba(0, 75, 141, 0.12)' }}>
        <MaterialIcons name={icon} size={24} color={BRAND.navy} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{title}</Text>
        {subtitle ? (
          <Text className="mt-0.5 text-sm leading-5 text-neutral-600 dark:text-neutral-400">{subtitle}</Text>
        ) : null}
      </View>
      <MaterialIcons name="chevron-right" size={22} color="#a3a3a3" />
    </Pressable>
  );
}

function openTicketCount(tickets: { status: string }[]): number {
  return tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;
}

export default function SupportScreen() {
  const user = useSessionStore((s) => s.user);

  const ticketsQuery = useQuery({
    queryKey: ['support', 'tickets'],
    queryFn: () => supportService.listTickets(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const refreshing = ticketsQuery.isRefetching;

  if (!user) {
    return (
      <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
        <Stack.Screen
          options={{
            title: 'Help & support',
            headerLeft: () => <MiniappHeaderBackButton />,
          }}
        />
        <FeatureEmptyState
          variant="full"
          icon="support-agent"
          title="Sign in for support"
          description="Message our team, open tickets for billing or disputes, and read help articles after you sign in."
          primaryAction={{
            label: 'Sign in',
            onPress: () => router.push('/login'),
            accessibilityLabel: 'Sign in to access support',
          }}
        />
      </View>
    );
  }

  const tickets = ticketsQuery.data ?? [];
  const activeTickets = openTicketCount(tickets);
  const ticketSubtitle =
    tickets.length === 0
      ? 'Billing, account, disputes, and more'
      : activeTickets > 0
        ? `${activeTickets} open or in progress · ${tickets.length} total`
        : `${tickets.length} ticket${tickets.length === 1 ? '' : 's'} · all closed or resolved`;

  return (
    <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
      <Stack.Screen
        options={{
          title: 'Help & support',
          headerLeft: () => <MiniappHeaderBackButton />,
        }}
      />
      <ScrollView
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void ticketsQuery.refetch()}
            tintColor={BRAND.navy}
          />
        }>
        <Text className="mb-1 px-5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Contact
        </Text>
        <HubRow
          icon="chat"
          title="Live support chat"
          subtitle="Message the LocalPro team — same thread as the support API and admin replies."
          onPress={() => router.push('/support/chat' as never)}
        />
        <HubRow
          icon="forum"
          title="Job message inbox"
          subtitle="Chats with providers on your jobs live in Messages."
          onPress={() => router.push('/messages' as never)}
        />

        <Text className="mb-1 mt-4 px-5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Tickets
        </Text>
        <HubRow
          icon="confirmation-number"
          title="My tickets"
          subtitle={ticketSubtitle}
          onPress={() => router.push('/support/tickets' as never)}
        />
        <HubRow
          icon="add-circle-outline"
          title="New ticket"
          subtitle="Subject, category, and details so the team can help quickly."
          onPress={() => router.push('/support/ticket-new' as never)}
        />

        <Text className="mb-1 mt-4 px-5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          Self‑service
        </Text>
        <HubRow
          icon="menu-book"
          title="Help articles"
          subtitle="Published guides and FAQs from LocalPro."
          onPress={() => router.push('/support/articles' as never)}
        />
      </ScrollView>
    </View>
  );
}
