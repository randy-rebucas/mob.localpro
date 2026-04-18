import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'localpro_refresh_token';

export async function setStoredRefreshToken(token: string | null): Promise<void> {
  if (token) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  } else {
    try {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      // missing key is fine
    }
  }
}
