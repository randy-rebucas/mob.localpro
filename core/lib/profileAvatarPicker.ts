import * as ImagePicker from 'expo-image-picker';

const pickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.85,
};

export type PickAvatarOutcome =
  | { ok: true; asset: ImagePicker.ImagePickerAsset }
  | { ok: false; reason: 'canceled' | 'denied' };

export async function pickAvatarFromLibrary(): Promise<PickAvatarOutcome> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    return { ok: false, reason: 'denied' };
  }
  const result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
  if (result.canceled || !result.assets?.[0]) {
    return { ok: false, reason: 'canceled' };
  }
  return { ok: true, asset: result.assets[0] };
}

export async function pickAvatarFromCamera(): Promise<PickAvatarOutcome> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    return { ok: false, reason: 'denied' };
  }
  const result = await ImagePicker.launchCameraAsync(pickerOptions);
  if (result.canceled || !result.assets?.[0]) {
    return { ok: false, reason: 'canceled' };
  }
  return { ok: true, asset: result.assets[0] };
}
