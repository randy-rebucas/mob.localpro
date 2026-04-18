import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { BRAND } from '@/constants/brand';
import { MiniappHeaderBackButton } from '@/core/navigation/miniappBack';
import { supportService } from '@/core/services/supportService';
import { useSessionStore } from '@/core/stores/sessionStore';
import { getApiErrorMessage } from '@/core/utils/apiError';

export default function SupportTicketDetailScreen() {
  const insets = useSafeAreaInsets();
  const user = useSessionStore((s) => s.user);
  const { id } = useLocalSearchParams<{ id: string }>();
  const ticketId = typeof id === 'string' ? id : id?.[0] ?? '';

  const query = useQuery({
    queryKey: ['support', 'ticket', ticketId],
    queryFn: () => supportService.getTicket(ticketId),
    enabled: !!user && !!ticketId,
  });

  if (!user) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Stack.Screen
          options={{
            title: 'Ticket',
            headerLeft: () => <MiniappHeaderBackButton />,
          }}
        />
        <Text className="text-center text-base text-neutral-700 dark:text-neutral-300">Sign in to view this ticket.</Text>
        <Pressable
          onPress={() => router.push('/login')}
          className="mt-6 self-center rounded-2xl px-6 py-3 active:opacity-90"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">Sign in</Text>
        </Pressable>
      </View>
    );
  }

  if (!ticketId) {
    return (
      <View className="flex-1 items-center justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Stack.Screen
          options={{
            title: 'Ticket',
            headerLeft: () => <MiniappHeaderBackButton />,
          }}
        />
        <Text className="text-center text-neutral-600 dark:text-neutral-400">Missing ticket id.</Text>
      </View>
    );
  }

  if (query.isPending) {
    return (
      <View className="flex-1 gap-3 bg-[#eef2f7] p-4 dark:bg-neutral-950">
        <Stack.Screen
          options={{
            title: 'Ticket',
            headerLeft: () => <MiniappHeaderBackButton />,
          }}
        />
        <SkeletonBlock className="h-8 w-3/4" />
        <SkeletonBlock className="h-40 w-full" />
      </View>
    );
  }

  if (query.isError) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Stack.Screen
          options={{
            title: 'Ticket',
            headerLeft: () => <MiniappHeaderBackButton />,
          }}
        />
        <MaterialIcons name="cloud-off" size={40} color="#737373" style={{ alignSelf: 'center' }} />
        <Text className="mt-4 text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">
          Couldn&apos;t load ticket
        </Text>
        <Text className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
          {getApiErrorMessage(query.error, 'Try again in a moment.')}
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

  const t = query.data;
  const statusLabel = t.status.replace(/_/g, ' ');

  return (
    <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
      <Stack.Screen
        options={{
          title: 'Ticket',
          headerLeft: () => <MiniappHeaderBackButton />,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
        <Text className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">{t.subject}</Text>
        <View className="mt-3 flex-row flex-wrap items-center gap-2">
          <View className="rounded-full bg-neutral-100 px-2.5 py-1 dark:bg-neutral-800">
            <Text className="text-xs font-medium capitalize text-neutral-700 dark:text-neutral-300">{statusLabel}</Text>
          </View>
          {t.category ? (
            <Text className="text-xs text-neutral-500 dark:text-neutral-400">{t.category}</Text>
          ) : null}
        </View>
        <Text className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
          Opened {new Date(t.createdAt).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' })}
        </Text>
        {t.body ? (
          <View className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Description
            </Text>
            <Text className="mt-2 text-sm leading-6 text-neutral-800 dark:text-neutral-200">{t.body}</Text>
          </View>
        ) : null}
        <Text className="mt-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
          Replies and status updates from support will appear here as the API exposes them.
        </Text>
      </ScrollView>
    </View>
  );
}
