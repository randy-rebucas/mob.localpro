import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native';

import { BRAND } from '@/constants/brand';
import { profileService } from '@/core/services/profileService';
import type { SavedAddress } from '@/core/types/profile';
import { useToastStore } from '@/core/stores/toastStore';
import { getApiErrorMessage } from '@/core/utils/apiError';

export default function ProfileAddressesScreen() {
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);

  const query = useQuery({
    queryKey: ['profile', 'addresses'],
    queryFn: () => profileService.listAddresses(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => profileService.deleteAddress(id),
    onSuccess: async () => {
      showToast('Address removed');
      await qc.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Could not delete'), 'error'),
  });

  function confirmDelete(item: SavedAddress) {
    Alert.alert('Remove address', `Remove “${item.label}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(item.id),
      },
    ]);
  }

  if (query.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-[#eef2f7] dark:bg-neutral-950">
        <Text className="text-sm text-neutral-500">Loading addresses…</Text>
      </View>
    );
  }

  if (query.isError) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Text className="text-center text-sm text-neutral-600 dark:text-neutral-400">{getApiErrorMessage(query.error)}</Text>
        <Pressable
          onPress={() => void query.refetch()}
          className="mt-6 self-center rounded-2xl px-8 py-3"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  const rows = query.data ?? [];

  return (
    <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
      <FlatList
        data={rows}
        keyExtractor={(a) => a.id}
        contentContainerClassName="grow px-4 pb-28 pt-3"
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}
        ListEmptyComponent={
          <Text className="mt-10 px-2 text-center text-sm text-neutral-500 dark:text-neutral-400">
            No saved addresses yet. Add your home or work location for faster job bookings.
          </Text>
        }
        renderItem={({ item }) => (
          <View className="mb-3 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <View className="flex-row items-start justify-between gap-2">
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push(`/profile/address-form?id=${encodeURIComponent(item.id)}` as never)}
                className="min-w-0 flex-1">
                <View className="flex-row flex-wrap items-center gap-2">
                  <Text className="text-base font-semibold text-neutral-900 dark:text-neutral-50">{item.label}</Text>
                  {item.isDefault ? (
                    <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${BRAND.navy}22` }}>
                      <Text style={{ color: BRAND.navy }} className="text-[10px] font-bold uppercase">
                        Default
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text className="mt-1 text-sm leading-5 text-neutral-600 dark:text-neutral-400">{item.line}</Text>
              </Pressable>
              <View className="flex-row gap-1">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit address"
                  onPress={() => router.push(`/profile/address-form?id=${encodeURIComponent(item.id)}` as never)}
                  className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-100 dark:active:bg-neutral-800">
                  <MaterialIcons name="edit" size={22} color={BRAND.navy} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Delete address"
                  onPress={() => confirmDelete(item)}
                  disabled={deleteMutation.isPending}
                  className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-100 dark:active:bg-neutral-800">
                  <MaterialIcons name="delete-outline" size={24} color="#b91c1c" />
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />
      <View className="absolute bottom-0 left-0 right-0 border-t border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/profile/address-form' as never)}
          className="flex-row items-center justify-center rounded-2xl py-3.5 active:opacity-90"
          style={{ backgroundColor: BRAND.navy }}>
          <MaterialIcons name="add" size={22} color="#fff" />
          <Text className="ml-2 text-base font-semibold text-white">Add address</Text>
        </Pressable>
      </View>
    </View>
  );
}
