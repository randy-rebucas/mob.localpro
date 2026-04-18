import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { memo, useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { BRAND } from '@/constants/brand';
import { MiniappHeaderBackButton } from '@/core/navigation/miniappBack';
import { notificationDataToHref } from '@/core/notifications/navigateFromNotificationData';
import { notificationService, type AppNotification } from '@/core/services/notificationService';
import { useSessionStore } from '@/core/stores/sessionStore';
import { useToastStore } from '@/core/stores/toastStore';
import { getApiErrorMessage } from '@/core/utils/apiError';

const NotificationRow = memo(function NotificationRow({
  item,
  onMarkRead,
  busyId,
}: {
  item: AppNotification;
  onMarkRead: (id: string) => void;
  busyId: string | null;
}) {
  const unread = item.read === false;
  const busy = busyId === item.id;
  const href = notificationDataToHref(item.data);
  const canOpen = !!href;
  const interactive = unread || canOpen;

  const onPress = () => {
    if (busy) return;
    if (unread) onMarkRead(item.id);
    if (href) router.push(href as never);
  };

  return (
    <Pressable
      accessibilityRole={canOpen ? 'link' : 'button'}
      accessibilityLabel={`${item.title}. ${item.body}`}
      accessibilityHint={canOpen ? 'Opens the related screen' : undefined}
      accessibilityState={{ disabled: !interactive || busy }}
      disabled={!interactive || busy}
      onPress={onPress}
      className={`mx-4 mb-3 rounded-2xl border border-neutral-200 bg-white p-4 active:opacity-95 dark:border-neutral-800 dark:bg-neutral-900 ${
        unread ? '' : 'opacity-90'
      }`}
      style={unread ? { borderLeftWidth: 4, borderLeftColor: BRAND.navy } : undefined}>
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{item.title}</Text>
          <Text className="mt-1 text-sm leading-5 text-neutral-600 dark:text-neutral-400">{item.body}</Text>
          <Text className="mt-2 text-xs text-neutral-400 dark:text-neutral-500">
            {new Date(item.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </Text>
        </View>
        <View className="flex-row items-center gap-1 pt-0.5">
          {canOpen ? (
            <MaterialIcons name="chevron-right" size={22} color="#a3a3a3" accessibilityLabel="Has link" />
          ) : null}
          {unread ? (
            <View className="min-w-[18px] items-center">
              {busy ? (
                <ActivityIndicator size="small" color={BRAND.navy} />
              ) : (
                <MaterialIcons name="fiber-manual-record" size={14} color={BRAND.navy} accessibilityLabel="Unread" />
              )}
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

export default function NotificationsScreen() {
  const user = useSessionStore((s) => s.user);
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.list({ limit: 50 }),
    enabled: !!user,
    staleTime: 30_000,
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Could not mark as read'), 'error'),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications'] });
      showToast('All caught up');
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Could not mark all read'), 'error'),
  });

  const { data, isPending, isError, isRefetching, refetch, error } = query;
  const rows = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;
  const titleUnread = unreadCount > 99 ? '99+' : unreadCount;

  const onMarkRead = useCallback(
    (id: string) => {
      markOneMutation.mutate(id);
    },
    [markOneMutation]
  );

  if (!user) {
    return (
      <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
        <Stack.Screen options={{ title: 'Notifications', headerLeft: () => <MiniappHeaderBackButton /> }} />
        <FeatureEmptyState
          variant="full"
          icon="notifications"
          title="Sign in for notifications"
          description="Job updates, payments, and reminders from LocalPro show up here when you are signed in."
          primaryAction={{
            label: 'Sign in',
            onPress: () => router.push('/login'),
            accessibilityLabel: 'Sign in to view notifications',
          }}
        />
      </View>
    );
  }

  if (isPending) {
    return (
      <View className="flex-1 gap-3 bg-[#eef2f7] p-4 dark:bg-neutral-950">
        <Stack.Screen options={{ title: 'Notifications', headerLeft: () => <MiniappHeaderBackButton /> }} />
        {[1, 2, 3].map((k) => (
          <SkeletonBlock key={k} className="h-16 w-full" />
        ))}
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Stack.Screen options={{ title: 'Notifications', headerLeft: () => <MiniappHeaderBackButton /> }} />
        <MaterialIcons name="cloud-off" size={40} color="#737373" style={{ alignSelf: 'center' }} />
        <Text className="mt-4 text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">
          Couldn&apos;t load notifications
        </Text>
        <Text className="mt-2 text-center text-sm text-neutral-600 dark:text-neutral-400">
          {getApiErrorMessage(error, 'Pull to refresh or try again.')}
        </Text>
        <Pressable
          onPress={() => void refetch()}
          className="mt-6 self-center rounded-2xl px-6 py-3 active:opacity-90"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  const showMarkAll = rows.length > 0 && unreadCount > 0;

  return (
    <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
      <Stack.Screen
        options={{
          title: unreadCount > 0 ? `Notifications (${titleUnread})` : 'Notifications',
          headerLeft: () => <MiniappHeaderBackButton />,
        }}
      />
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          rows.length === 0 ? { flexGrow: 1, paddingTop: 8, paddingBottom: 24 } : { paddingTop: 8, paddingBottom: 24 }
        }
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={BRAND.navy} />
        }
        ListHeaderComponent={
          showMarkAll ? (
            <View className="mb-2 px-4">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Mark all notifications as read"
                disabled={markAllMutation.isPending}
                onPress={() => markAllMutation.mutate()}
                className="flex-row items-center justify-center self-end rounded-full border border-neutral-200 bg-white px-4 py-2 active:opacity-90 dark:border-neutral-700 dark:bg-neutral-900">
                {markAllMutation.isPending ? (
                  <ActivityIndicator size="small" color={BRAND.navy} />
                ) : (
                  <>
                    <MaterialIcons name="done-all" size={18} color={BRAND.navy} />
                    <Text style={{ color: BRAND.navy }} className="ml-2 text-sm font-semibold dark:text-sky-300">
                      Mark all read
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <FeatureEmptyState
            variant="full"
            icon="notifications-none"
            title="No notifications"
            description="When providers quote your jobs, payments move, or reminders fire, they will show up here."
          />
        }
        renderItem={({ item }) => (
          <NotificationRow
            item={item}
            onMarkRead={onMarkRead}
            busyId={markOneMutation.isPending ? (markOneMutation.variables as string | undefined) ?? null : null}
          />
        )}
      />
    </View>
  );
}
