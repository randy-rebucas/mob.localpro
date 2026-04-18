import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { memo, useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { BRAND } from '@/constants/brand';
import { MiniappHeaderBackButton } from '@/core/navigation/miniappBack';
import { supportService, type SupportTicketListItem } from '@/core/services/supportService';
import { useSessionStore } from '@/core/stores/sessionStore';
import { getApiErrorMessage } from '@/core/utils/apiError';

const Row = memo(function Row({ item }: { item: SupportTicketListItem }) {
  const go = useCallback(() => {
    router.push(`/support/ticket/${item.id}` as never);
  }, [item.id]);

  const statusLabel = item.status.replace(/_/g, ' ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ticket ${item.subject}, ${statusLabel}`}
      onPress={go}
      className="mx-4 mb-3 rounded-2xl border border-neutral-200 bg-white p-4 active:opacity-95 dark:border-neutral-800 dark:bg-neutral-900">
      <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{item.subject}</Text>
      <View className="mt-2 flex-row flex-wrap items-center gap-2">
        <View className="rounded-full bg-neutral-100 px-2.5 py-0.5 dark:bg-neutral-800">
          <Text className="text-xs font-medium capitalize text-neutral-600 dark:text-neutral-400">{statusLabel}</Text>
        </View>
        {item.category ? (
          <Text className="text-xs text-neutral-500 dark:text-neutral-400">{item.category}</Text>
        ) : null}
      </View>
      <Text className="mt-2 text-[11px] text-neutral-400 dark:text-neutral-500">
        {new Date(item.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
      </Text>
    </Pressable>
  );
});

export default function SupportTicketsScreen() {
  const user = useSessionStore((s) => s.user);

  const query = useQuery({
    queryKey: ['support', 'tickets'],
    queryFn: () => supportService.listTickets(),
    enabled: !!user,
    staleTime: 30_000,
  });

  if (!user) {
    return (
      <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
        <Stack.Screen
          options={{
            title: 'My tickets',
            headerLeft: () => <MiniappHeaderBackButton />,
          }}
        />
        <FeatureEmptyState
          variant="full"
          icon="confirmation-number"
          title="Sign in to view tickets"
          description="Create and track billing, account, and dispute requests after you sign in."
          primaryAction={{
            label: 'Sign in',
            onPress: () => router.push('/login'),
            accessibilityLabel: 'Sign in to view support tickets',
          }}
        />
      </View>
    );
  }

  if (query.isPending) {
    return (
      <View className="flex-1 gap-3 bg-[#eef2f7] p-4 dark:bg-neutral-950">
        <Stack.Screen
          options={{
            title: 'My tickets',
            headerLeft: () => <MiniappHeaderBackButton />,
          }}
        />
        {[1, 2, 3].map((k) => (
          <SkeletonBlock key={k} className="h-20 w-full" />
        ))}
      </View>
    );
  }

  if (query.isError) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Stack.Screen
          options={{
            title: 'My tickets',
            headerLeft: () => <MiniappHeaderBackButton />,
          }}
        />
        <MaterialIcons name="cloud-off" size={40} color="#737373" style={{ alignSelf: 'center' }} />
        <Text className="mt-4 text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">
          Couldn&apos;t load tickets
        </Text>
        <Text className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
          {getApiErrorMessage(query.error, 'Pull to refresh or try again.')}
        </Text>
        <Pressable
          onPress={() => void query.refetch()}
          className="mt-6 self-center rounded-2xl px-6 py-3 active:opacity-90"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  const rows = query.data ?? [];

  return (
    <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
      <Stack.Screen
        options={{
          title: 'My tickets',
          headerLeft: () => <MiniappHeaderBackButton />,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New support ticket"
              hitSlop={10}
              onPress={() => router.push('/support/ticket-new' as never)}
              className="mr-1 rounded-full p-2 active:opacity-70">
              <MaterialIcons name="add" size={26} color={BRAND.navy} />
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={rows}
        keyExtractor={(t) => t.id}
        contentContainerStyle={
          rows.length === 0 ? { flexGrow: 1, paddingTop: 8, paddingBottom: 24 } : { paddingTop: 8, paddingBottom: 24 }
        }
        refreshControl={
          <RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={BRAND.navy} />
        }
        renderItem={({ item }) => <Row item={item} />}
        ListEmptyComponent={
          <FeatureEmptyState
            variant="full"
            icon="confirmation-number"
            title="No tickets yet"
            description="Open a ticket for billing, account issues, disputes, or technical help. Our team will track it here."
            primaryAction={{
              label: 'New ticket',
              onPress: () => router.push('/support/ticket-new' as never),
              accessibilityLabel: 'Create a new support ticket',
            }}
          />
        }
      />
    </View>
  );
}
