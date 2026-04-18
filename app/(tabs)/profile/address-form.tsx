import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Location from 'expo-location';

import { BRAND } from '@/constants/brand';
import { profileService } from '@/core/services/profileService';
import { useToastStore } from '@/core/stores/toastStore';
import { getApiErrorMessage } from '@/core/utils/apiError';

export default function ProfileAddressFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const addressId = useMemo(() => {
    const raw = id;
    const v = Array.isArray(raw) ? raw[0] : raw;
    return v ? decodeURIComponent(v) : '';
  }, [id]);

  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);
  const [label, setLabel] = useState('');
  const [line, setLine] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  const listQuery = useQuery({
    queryKey: ['profile', 'addresses'],
    queryFn: () => profileService.listAddresses(),
    enabled: !!addressId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        label: label.trim(),
        address: line.trim(),
        ...(coords ? { coordinates: coords } : {}),
        isDefault,
      };
      if (addressId) {
        return profileService.updateAddress(addressId, payload);
      }
      return profileService.addAddress(payload);
    },
    onSuccess: async () => {
      showToast(addressId ? 'Address updated' : 'Address saved');
      await qc.invalidateQueries({ queryKey: ['profile'] });
      router.back();
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Could not save address'), 'error'),
  });

  useEffect(() => {
    if (!addressId || !listQuery.data) return;
    const hit = listQuery.data.find((a) => a.id === addressId);
    if (hit) {
      setLabel(hit.label);
      setLine(hit.line);
      setIsDefault(hit.isDefault);
      if (hit.lat != null && hit.lng != null) {
        setCoords({ lat: hit.lat, lng: hit.lng });
      }
    }
  }, [addressId, listQuery.data]);

  async function useGps() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location', 'Allow location to attach GPS coordinates to this address.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      showToast('Location captured');
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Could not read GPS'), 'error');
    } finally {
      setLocating(false);
    }
  }

  function onSave() {
    if (!label.trim() || !line.trim()) {
      showToast('Label and address are required', 'error');
      return;
    }
    saveMutation.mutate();
  }

  const title = addressId ? 'Edit address' : 'New address';

  if (addressId && listQuery.isPending) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <View className="flex-1 items-center justify-center bg-[#eef2f7] dark:bg-neutral-950">
          <ActivityIndicator color={BRAND.navy} />
        </View>
      </>
    );
  }

  if (addressId && listQuery.isSuccess && !listQuery.data?.some((a) => a.id === addressId)) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <View className="flex-1 items-center justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
          <Text className="text-center text-sm text-neutral-600 dark:text-neutral-400">Address not found.</Text>
          <Pressable onPress={() => router.back()} className="mt-6 rounded-2xl px-6 py-3" style={{ backgroundColor: BRAND.navy }}>
            <Text className="font-semibold text-white">Go back</Text>
          </Pressable>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="grow px-5 pb-10 pt-4">
          <Text className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Label</Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="Home, Office…"
            placeholderTextColor="#9ca3af"
            className="mt-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          />

          <Text className="mt-5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Street address</Text>
          <TextInput
            value={line}
            onChangeText={setLine}
            placeholder="Building, street, city"
            placeholderTextColor="#9ca3af"
            multiline
            className="mt-2 min-h-[100px] rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            textAlignVertical="top"
          />

          <View className="mt-5 flex-row items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
            <Text className="text-base text-neutral-900 dark:text-neutral-100">Default address</Text>
            <Switch value={isDefault} onValueChange={setIsDefault} trackColor={{ true: BRAND.navy }} />
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={locating}
            onPress={() => void useGps()}
            className="mt-4 flex-row items-center justify-center rounded-2xl border-2 border-neutral-300 bg-white py-3.5 dark:border-neutral-600 dark:bg-neutral-900">
            {locating ? (
              <ActivityIndicator color={BRAND.navy} />
            ) : (
              <Text className="text-[15px] font-semibold text-neutral-800 dark:text-neutral-200">Use current GPS</Text>
            )}
          </Pressable>
          {coords ? (
            <Text className="mt-2 text-center text-xs text-neutral-500">
              GPS: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </Text>
          ) : (
            <Text className="mt-2 text-center text-xs text-neutral-500">Coordinates optional — add GPS for better maps accuracy.</Text>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={saveMutation.isPending}
            onPress={onSave}
            className="mt-8 flex-row items-center justify-center rounded-2xl py-4 active:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: BRAND.navy }}>
            {saveMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-semibold text-white">{addressId ? 'Save changes' : 'Save address'}</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
