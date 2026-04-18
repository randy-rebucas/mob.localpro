import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { Stack, router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

import { BRAND } from '@/constants/brand';
import { MiniappHeaderBackButton } from '@/core/navigation/miniappBack';
import { providerService } from '@/core/services/providerService';
import { useSessionStore } from '@/core/stores/sessionStore';

const DEFAULT_REGION: Region = {
  latitude: 14.5995,
  longitude: 120.9842,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

export default function DiscoveryMapScreen() {
  const user = useSessionStore((s) => s.user);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [locReady, setLocReady] = useState(false);
  const mapKey = `${region.latitude.toFixed(4)}-${region.longitude.toFixed(4)}`;

  const providersQuery = useQuery({
    queryKey: ['providers', 'mapPins', user?.id ?? 'guest'],
    queryFn: async () => {
      const res = user
        ? await providerService.list({ page: 1, pageSize: 200 })
        : await providerService.listPublic({ page: 1 });
      return res.items;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) {
        setLocReady(true);
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        setRegion({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.12,
          longitudeDelta: 0.12,
        });
      } catch {
        /* keep default */
      } finally {
        if (!cancelled) setLocReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pins = useMemo(() => {
    const rows = providersQuery.data ?? [];
    return rows.filter((r) => typeof r.lat === 'number' && typeof r.lng === 'number');
  }, [providersQuery.data]);

  return (
    <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
      <Stack.Screen options={{ title: 'Map', headerLeft: () => <MiniappHeaderBackButton /> }} />
      {!locReady || providersQuery.isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={BRAND.navy} />
        </View>
      ) : providersQuery.isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base text-neutral-700 dark:text-neutral-300">Could not load providers.</Text>
          <Pressable
            onPress={() => void providersQuery.refetch()}
            className="mt-4 rounded-2xl px-5 py-2.5"
            style={{ backgroundColor: BRAND.navy }}>
            <Text className="font-semibold text-white">Retry</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <MapView key={mapKey} style={{ flex: 1 }} initialRegion={region}>
            {pins.map((p) => (
              <Marker
                key={p.id}
                coordinate={{ latitude: p.lat!, longitude: p.lng! }}
                title={p.displayName}
                description={p.subtitle}
                onPress={() => router.push(`/discovery/providers/${encodeURIComponent(p.id)}` as never)}
              />
            ))}
          </MapView>
          {!user ? (
            <View className="absolute top-3 left-3 right-3 rounded-xl border border-neutral-200 bg-white/95 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-900/95">
              <Text className="text-center text-xs text-neutral-600 dark:text-neutral-400">
                Guest map · Sign in from the list to save favorites and see full profile details.
              </Text>
            </View>
          ) : null}
          {pins.length === 0 ? (
            <View className="absolute bottom-4 left-4 right-4 rounded-2xl border border-neutral-200 bg-white/95 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900/95">
              <Text className="text-center text-sm text-neutral-700 dark:text-neutral-300">
                No map coordinates returned for providers yet. Open the list to browse profiles.
              </Text>
              <Pressable
                onPress={() => router.back()}
                className="mt-2 items-center py-2"
                accessibilityRole="button"
                accessibilityLabel="Back to provider list">
                <Text className="text-sm font-semibold" style={{ color: BRAND.navy }}>
                  Back to list
                </Text>
              </Pressable>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}
