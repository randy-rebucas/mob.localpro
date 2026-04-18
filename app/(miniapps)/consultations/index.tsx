import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useQuery } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { BRAND } from '@/constants/brand';
import { MiniappHeaderBackButton } from '@/core/navigation/miniappBack';
import { consultationService, type ConsultationListItem } from '@/core/services/consultationService';
import { useSessionStore } from '@/core/stores/sessionStore';
import { getApiErrorMessage } from '@/core/utils/apiError';

const STATUS_FILTERS: { label: string; value?: string }[] = [
  { label: 'All' },
  { label: 'Pending', value: 'pending' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Declined', value: 'declined' },
];

const Row = memo(function Row({ item }: { item: ConsultationListItem }) {
  const go = useCallback(() => {
    router.push(`/consultations/${encodeURIComponent(item.id)}` as never);
  }, [item.id]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}. Status ${item.status}.`}
      onPress={go}
      className="mx-4 mb-3 rounded-2xl border border-neutral-200 bg-white p-4 active:opacity-95 dark:border-neutral-800 dark:bg-neutral-900">
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50" numberOfLines={2}>
            {item.title}
          </Text>
          <Text className="mt-1 text-xs capitalize text-neutral-500 dark:text-neutral-400">
            {item.type.replace(/_/g, ' ')} · {new Date(item.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
          </Text>
        </View>
        <View className="rounded-full bg-[#eef2f7] px-2.5 py-1 dark:bg-neutral-800">
          <Text className="text-[11px] font-semibold capitalize text-neutral-700 dark:text-neutral-200">{item.status}</Text>
        </View>
      </View>
    </Pressable>
  );
});

function StatusChip({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onSelect}
      className={`mr-2 rounded-full border px-3 py-1.5 ${
        selected ? 'border-transparent' : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'
      }`}
      style={selected ? { backgroundColor: BRAND.navy } : undefined}>
      <Text className={`text-xs font-semibold ${selected ? 'text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function ConsultationsIndexScreen() {
  const user = useSessionStore((s) => s.user);
  const [status, setStatus] = useState<string | undefined>(undefined);

  const listParams = useMemo(() => ({ status, page: 1, limit: 30 }), [status]);

  const listQuery = useQuery({
    queryKey: ['consultations', 'list', listParams.status ?? 'all', listParams.page, listParams.limit],
    queryFn: () => consultationService.list(listParams),
    enabled: !!user,
    staleTime: 20_000,
  });

  const rows = listQuery.data?.items ?? [];

  if (!user) {
    return (
      <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
        <Stack.Screen
          options={{
            title: 'Consultations',
            headerLeft: () => <MiniappHeaderBackButton />,
          }}
        />
        <FeatureEmptyState
          variant="full"
          icon="medical-services"
          title="Sign in for consultations"
          description="Request a consultation with a professional, message in the thread, and convert to a job when you are signed in."
          primaryAction={{
            label: 'Sign in',
            onPress: () => router.push('/login'),
            accessibilityLabel: 'Sign in to use consultations',
          }}
        />
      </View>
    );
  }

  if (listQuery.isPending) {
    return (
      <View className="flex-1 gap-3 bg-[#eef2f7] p-4 dark:bg-neutral-950">
        <Stack.Screen
          options={{
            title: 'Consultations',
            headerLeft: () => <MiniappHeaderBackButton />,
          }}
        />
        {[1, 2, 3, 4].map((k) => (
          <SkeletonBlock key={k} className="h-20 w-full" />
        ))}
      </View>
    );
  }

  if (listQuery.isError) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Stack.Screen
          options={{
            title: 'Consultations',
            headerLeft: () => <MiniappHeaderBackButton />,
          }}
        />
        <MaterialIcons name="cloud-off" size={40} color="#737373" style={{ alignSelf: 'center' }} />
        <Text className="mt-4 text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">
          Couldn&apos;t load consultations
        </Text>
        <Text className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
          {getApiErrorMessage(listQuery.error, 'Pull to refresh or try again.')}
        </Text>
        <Pressable
          onPress={() => void listQuery.refetch()}
          className="mt-6 self-center rounded-2xl px-6 py-3 active:opacity-90"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
      <Stack.Screen
        options={{
          title: 'Consultations',
          headerLeft: () => <MiniappHeaderBackButton />,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New consultation"
              hitSlop={12}
              onPress={() => router.push('/consultations/new' as never)}
              className="mr-1 rounded-full p-2 active:opacity-70">
              <MaterialIcons name="add" size={26} color={BRAND.navy} />
            </Pressable>
          ),
        }}
      />
      <View className="border-b border-neutral-200 bg-white px-4 pb-3 pt-2 dark:border-neutral-800 dark:bg-neutral-900">
        <Text className="text-xs text-neutral-500 dark:text-neutral-400">
          Filter by status (matches your API&apos;s status values).
        </Text>
        <View className="mt-2 flex-row flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <StatusChip
              key={f.label}
              label={f.label}
              selected={f.value === status || (f.value === undefined && status === undefined)}
              onSelect={() => setStatus(f.value)}
            />
          ))}
        </View>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          rows.length === 0 ? { flexGrow: 1, paddingTop: 8, paddingBottom: 24 } : { paddingTop: 8, paddingBottom: 24 }
        }
        refreshControl={
          <RefreshControl
            refreshing={listQuery.isRefetching}
            onRefresh={() => void listQuery.refetch()}
            tintColor={BRAND.navy}
          />
        }
        renderItem={({ item }) => <Row item={item} />}
        ListEmptyComponent={
          <FeatureEmptyState
            variant="full"
            icon="chat-bubble-outline"
            title="No consultations yet"
            description="Start a consultation with a professional. You can track status and message here."
            primaryAction={{
              label: 'Request consultation',
              onPress: () => router.push('/consultations/new' as never),
              accessibilityLabel: 'Request a new consultation',
            }}
          />
        }
      />
    </View>
  );
}
