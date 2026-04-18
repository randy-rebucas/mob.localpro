import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/** AsyncStorage + SecureStore helpers (see `MOBILE_AUTH_IMPLEMENTATION_GUIDE.md`). */
export const Storage = {
  async setSecure(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },

  async getSecure(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },

  async removeSecure(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // ignore
    }
  },

  async set(key: string, value: unknown): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },

  async get<T = unknown>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
};
