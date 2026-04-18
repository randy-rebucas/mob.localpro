import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import type { LocationGeocodedAddress } from 'expo-location';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BRAND } from '@/constants/brand';
import { suggestAddresses, type AddressSuggestion } from '@/core/services/placesSuggestService';
import { profileService } from '@/core/services/profileService';
import { useToastStore } from '@/core/stores/toastStore';
import { getApiErrorMessage } from '@/core/utils/apiError';

/** Saved-address labels (dropdown). Legacy labels not in this list stay selectable until changed. */
const ADDRESS_LABEL_OPTIONS = ['Home', 'Work', 'Office', 'Parents', 'Billing', 'Other'] as const;

function formatReverseGeocodeAddress(addr: LocationGeocodedAddress): string {
  const formatted = addr.formattedAddress?.trim();
  if (formatted) return formatted;

  const line1 = [addr.streetNumber, addr.street].filter(Boolean).join(' ').trim();
  const locality = [addr.city || addr.district, addr.subregion, addr.region, addr.postalCode].filter(Boolean).join(', ');
  const name = addr.name?.trim();
  const first = line1 || name || '';
  return [first, locality, addr.country].filter(Boolean).join(', ');
}

export default function ProfileAddressFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const addressId = useMemo(() => {
    const raw = id;
    const v = Array.isArray(raw) ? raw[0] : raw;
    return v ? decodeURIComponent(v) : '';
  }, [id]);

  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);
  const insets = useSafeAreaInsets();
  const [label, setLabel] = useState('');
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);
  const [line, setLine] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [debouncedLine, setDebouncedLine] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const lastPickedLineRef = useRef<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedLine(line.trim()), 400);
    return () => clearTimeout(t);
  }, [line]);

  useEffect(() => {
    if (debouncedLine.length < 3) {
      setSuggestions([]);
      setSuggestLoading(false);
      return;
    }
    if (lastPickedLineRef.current && debouncedLine === lastPickedLineRef.current) {
      setSuggestions([]);
      setSuggestLoading(false);
      return;
    }

    const ac = new AbortController();
    setSuggestLoading(true);
    void suggestAddresses(debouncedLine, ac.signal)
      .then((list) => {
        if (!ac.signal.aborted) setSuggestions(list);
      })
      .catch(() => {
        if (!ac.signal.aborted) setSuggestions([]);
      })
      .finally(() => {
        if (!ac.signal.aborted) setSuggestLoading(false);
      });

    return () => ac.abort();
  }, [debouncedLine]);

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

  async function fillFromCurrentLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location', 'Allow location to fill your address from where you are right now.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setCoords({ lat, lng });

      const places = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const first = places[0];
      if (first) {
        const text = formatReverseGeocodeAddress(first).trim();
        if (text) {
          lastPickedLineRef.current = text;
          setLine(text);
          setSuggestions([]);
          showToast('Address filled from your location');
          return;
        }
      }
      lastPickedLineRef.current = null;
      showToast('Location saved — add street details if the address line is empty');
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Could not use current location'), 'error');
    } finally {
      setLocating(false);
    }
  }

  function onSave() {
    if (!label.trim() || !line.trim()) {
      showToast(!label.trim() ? 'Choose an address label' : 'Street address is required', 'error');
      return;
    }
    saveMutation.mutate();
  }

  function onSelectSuggestion(s: AddressSuggestion) {
    lastPickedLineRef.current = s.line;
    setLine(s.line);
    setCoords({ lat: s.lat, lng: s.lng });
    setSuggestions([]);
    setSuggestLoading(false);
  }

  const title = addressId ? 'Edit address' : 'New address';

  const pickerOptions = useMemo(() => {
    const l = label.trim();
    const opts: string[] = [...ADDRESS_LABEL_OPTIONS];
    const presetList: string[] = [...ADDRESS_LABEL_OPTIONS];
    if (l && !presetList.includes(l)) opts.unshift(l);
    return opts;
  }, [label]);

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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose address label"
            accessibilityHint="Opens a list of label options"
            onPress={() => setLabelPickerOpen(true)}
            className="mt-2 flex-row items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 active:opacity-90 dark:border-neutral-700 dark:bg-neutral-900">
            <Text
              className={`text-base ${label.trim() ? 'text-neutral-900 dark:text-neutral-50' : 'text-neutral-400 dark:text-neutral-500'}`}>
              {label.trim() ? label : 'Choose label'}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={28} color={BRAND.navy} />
          </Pressable>

          <Modal
            visible={labelPickerOpen}
            animationType="slide"
            transparent
            onRequestClose={() => setLabelPickerOpen(false)}>
            <View className="flex-1 justify-end">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close label picker"
                className="flex-1 bg-black/45"
                onPress={() => setLabelPickerOpen(false)}
              >
                <View className="flex-1" />
              </Pressable>
              <View
                className="rounded-t-3xl border-t border-neutral-200 bg-white px-4 pt-3 dark:border-neutral-800 dark:bg-neutral-900"
                style={{ paddingBottom: Math.max(insets.bottom, 20) }}>
                <View className="mb-3 flex-row items-center justify-between">
                  <Text className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Address label</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    hitSlop={12}
                    onPress={() => setLabelPickerOpen(false)}
                    className="h-10 w-10 items-center justify-center rounded-full active:bg-neutral-100 dark:active:bg-neutral-800">
                    <MaterialIcons name="close" size={22} color="#737373" />
                  </Pressable>
                </View>
                <ScrollView keyboardShouldPersistTaps="handled" className="max-h-[360px]">
                  {pickerOptions.map((opt, i) => {
                    const selected = label.trim() === opt;
                    return (
                      <Pressable
                        key={opt}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`Label ${opt}`}
                        onPress={() => {
                          setLabel(opt);
                          setLabelPickerOpen(false);
                        }}
                        className={`flex-row items-center justify-between py-3.5 ${
                          i < pickerOptions.length - 1 ? 'border-b border-neutral-100 dark:border-neutral-800' : ''
                        } active:bg-neutral-50 dark:active:bg-neutral-800/80`}>
                        <Text className="text-base text-neutral-900 dark:text-neutral-100">{opt}</Text>
                        {selected ? <MaterialIcons name="check" size={22} color={BRAND.navy} /> : null}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </Modal>

          <Text className="mt-5 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Street address</Text>
          <Text className="mt-1 text-xs leading-4 text-neutral-500 dark:text-neutral-400">
            Type at least 3 characters for suggestions (Philippines-biased search).
          </Text>
          <TextInput
            accessibilityLabel="Street address"
            value={line}
            onChangeText={(t) => {
              lastPickedLineRef.current = null;
              setLine(t);
            }}
            placeholder="Building, street, city"
            placeholderTextColor="#9ca3af"
            multiline
            className="mt-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            textAlignVertical="top"
          />
          {suggestLoading ? (
            <View className="mt-2 flex-row items-center gap-2 px-1">
              <ActivityIndicator size="small" color={BRAND.navy} />
              <Text className="text-xs text-neutral-500 dark:text-neutral-400">Searching places…</Text>
            </View>
          ) : null}
          {suggestions.length > 0 ? (
            <View className="mt-2 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              {suggestions.map((s, i) => (
                <Pressable
                  key={s.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Use address ${s.line}`}
                  onPress={() => onSelectSuggestion(s)}
                  className={`px-4 py-3.5 active:bg-neutral-50 dark:active:bg-neutral-800/80 ${
                    i < suggestions.length - 1 ? 'border-b border-neutral-100 dark:border-neutral-800' : ''
                  }`}>
                  <Text className="text-sm leading-5 text-neutral-900 dark:text-neutral-100">{s.line}</Text>
                  <Text className="mt-1 text-[11px] text-neutral-400">Tap to fill address and map pin</Text>
                </Pressable>
              ))}
              <Text className="bg-neutral-50 px-3 py-2 text-[10px] leading-4 text-neutral-500 dark:bg-neutral-950 dark:text-neutral-500">
                © OpenStreetMap contributors — search by Photon / Komoot
              </Text>
            </View>
          ) : null}

          <View className="mt-5 flex-row items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
            <Text className="text-base text-neutral-900 dark:text-neutral-100">Default address</Text>
            <Switch value={isDefault} onValueChange={setIsDefault} trackColor={{ true: BRAND.navy }} />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use current location to fill address"
            disabled={locating}
            onPress={() => void fillFromCurrentLocation()}
            className="mt-4 flex-row items-center justify-center rounded-2xl border-2 border-neutral-300 bg-white py-3.5 dark:border-neutral-600 dark:bg-neutral-900">
            {locating ? (
              <ActivityIndicator color={BRAND.navy} />
            ) : (
              <Text className="text-[15px] font-semibold text-neutral-800 dark:text-neutral-200">Current location</Text>
            )}
          </Pressable>
          {coords ? (
            <Text className="mt-2 text-center text-xs text-neutral-500">
              Pin: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
            </Text>
          ) : (
            <Text className="mt-2 text-center text-xs text-neutral-500">
              Optional — use Current location to set the map pin and street field from the device.
            </Text>
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
