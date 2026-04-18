# Mobile Authentication — Implementation Guide

Practical patterns and code examples for building secure mobile auth in LocalPro apps.

**For:** iOS (Swift), Android (Kotlin), React Native  
**Version:** 1.0  
**Updated:** April 18, 2026

---

## Table of Contents

1. [Project Setup](#project-setup)
2. [Secure Storage](#secure-storage)
3. [API Client Configuration](#api-client-configuration)
4. [Auth Flow State Machine](#auth-flow-state-machine)
5. [Authentication Screens](#authentication-screens)
6. [Deep Link Handling](#deep-link-handling)
7. [Session Management](#session-management)
8. [Token Refresh Strategy](#token-refresh-strategy)
9. [Biometric Authentication](#biometric-authentication)
10. [Testing Auth Flows](#testing-auth-flows)

---

## Project Setup

### React Native Project

```bash
# Create project
npx create-expo-app LocalProMobile
cd LocalProMobile

# Install dependencies
npm install axios zustand react-native-keychain react-navigation @react-navigation/native
npm install react-native-screens react-native-safe-area-context
npm install expo-linking expo-web-browser

# Setup
npx expo install expo-linking expo-web-browser
```

### Directory Structure

```
src/
├── api/
│   ├── client.ts          # Axios setup
│   └── auth.ts            # Auth endpoints
├── stores/
│   ├── auth.store.ts      # Zustand auth store
│   └── app.store.ts       # App state
├── screens/
│   ├── auth/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── PhoneLogin.tsx
│   │   └── ForgotPassword.tsx
│   └── app/
│       ├── Home.tsx
│       └── Profile.tsx
├── components/
│   ├── LoadingOverlay.tsx
│   └── ErrorAlert.tsx
├── lib/
│   ├── storage.ts         # Keychain access
│   ├── deeplinks.ts       # Deep link handling
│   └── validation.ts
└── types/
    └── auth.ts
```

---

## Secure Storage

### iOS - Keychain Storage

```swift
import KeychainSwift

class SecureStorage {
    static let shared = SecureStorage()
    private let keychain = KeychainSwift()
    
    enum StorageKey: String {
        case accessToken = "com.localpro.auth.access_token"
        case refreshToken = "com.localpro.auth.refresh_token"
        case userId = "com.localpro.auth.user_id"
        case csrfToken = "com.localpro.auth.csrf_token"
    }
    
    // Save token
    func save(_ value: String, forKey key: StorageKey) {
        keychain.set(value, forKey: key.rawValue, withAccess: .accessibleAfterFirstUnlock)
    }
    
    // Retrieve token
    func retrieve(forKey key: StorageKey) -> String? {
        return keychain.get(key.rawValue)
    }
    
    // Delete token
    func delete(forKey key: StorageKey) {
        keychain.delete(key.rawValue)
    }
    
    // Clear all auth data
    func clearAll() {
        StorageKey.allCases.forEach { delete(forKey: $0) }
    }
}

// Usage
SecureStorage.shared.save(accessToken, forKey: .accessToken)
let token = SecureStorage.shared.retrieve(forKey: .accessToken)
```

### Android - Encrypted SharedPreferences

```kotlin
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

object SecureStorage {
    private lateinit var encryptedPreferences: EncryptedSharedPreferences
    
    fun init(context: Context) {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        
        encryptedPreferences = EncryptedSharedPreferences.create(
            context,
            "auth_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        ) as EncryptedSharedPreferences
    }
    
    fun saveToken(key: String, value: String) {
        encryptedPreferences.edit().putString(key, value).apply()
    }
    
    fun getToken(key: String): String? {
        return encryptedPreferences.getString(key, null)
    }
    
    fun deleteToken(key: String) {
        encryptedPreferences.edit().remove(key).apply()
    }
    
    fun clearAll() {
        encryptedPreferences.edit().clear().apply()
    }
}

// Usage in MainActivity
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    SecureStorage.init(this)
}

SecureStorage.saveToken("access_token", accessToken)
val token = SecureStorage.getToken("access_token")
```

### React Native - AsyncStorage + Keychain

```typescript
// lib/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

export const Storage = {
  // Secure storage for sensitive data (tokens)
  async setSecure(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('Failed to save secure value:', error);
    }
  },

  async getSecure(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Failed to retrieve secure value:', error);
      return null;
    }
  },

  async removeSecure(key: string) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Failed to remove secure value:', error);
    }
  },

  // Regular storage for non-sensitive data
  async set(key: string, value: any) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save value:', error);
    }
  },

  async get(key: string): Promise<any | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Failed to retrieve value:', error);
      return null;
    }
  },

  async remove(key: string) {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove value:', error);
    }
  },

  async clear() {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  },
};

// Usage
await Storage.setSecure('access_token', token);
const token = await Storage.getSecure('access_token');
```

---

## API Client Configuration

### React Native Axios Setup

```typescript
// api/client.ts
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Storage } from '@/lib/storage';

const API_BASE = 'https://localpro-marketplace.vercel.app';

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Cache CSRF token with expiration
let csrfCache: { token: string; expiresAt: number } | null = null;

// Request interceptor: Add CSRF token for mutations
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const method = config.method?.toLowerCase();
  const isMutation = ['post', 'put', 'patch', 'delete'].includes(method || '');

  if (isMutation) {
    let csrfToken = csrfCache?.token;

    // Fetch new token if expired
    if (!csrfToken || Date.now() >= (csrfCache?.expiresAt ?? 0) * 1000) {
      try {
        const res = await axios.get(`${API_BASE}/api/auth/csrf`, {
          withCredentials: true,
        });
        csrfToken = res.data.token;
        csrfCache = { token: csrfToken, expiresAt: res.data.expiresAt };
      } catch (error) {
        console.error('Failed to get CSRF token:', error);
      }
    }

    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }

  return config;
}, (error) => Promise.reject(error));

// Response interceptor: Handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401) {
      // Unauthorized - clear auth and redirect
      await Storage.removeSecure('access_token');
      await Storage.removeSecure('refresh_token');
      // Trigger logout in auth store
      authStore.logout();
    } else if (status === 403) {
      // Forbidden - likely CSRF token expired
      csrfCache = null;
      // Retry request with new CSRF token
      if (error.config && error.config.method !== 'get') {
        return api.request(error.config);
      }
    } else if (status === 429) {
      // Rate limited - include retry-after in error
      const retryAfter = error.response?.headers['retry-after'];
      error.message = `Rate limited. Retry after ${retryAfter}s`;
    }

    return Promise.reject(error);
  }
);

export default api;
```

### Auth API Functions

```typescript
// api/auth.ts
import api from './client';
import { Storage } from '@/lib/storage';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  role: 'client' | 'provider';
  accountType: 'personal' | 'business';
  phone?: string;
  referralCode?: string;
}

export interface AuthResponse {
  user: {
    _id: string;
    name: string;
    email: string;
    role: 'client' | 'provider';
    isVerified: boolean;
    avatar: string | null;
    phone: string | null;
  };
}

export const authAPI = {
  async register(payload: RegisterPayload) {
    const res = await api.post<AuthResponse>('/api/auth/register', payload);
    return res.data;
  },

  async login(payload: LoginPayload) {
    const res = await api.post<AuthResponse>('/api/auth/login', payload);
    return res.data;
  },

  async loginWithPhone(phone: string) {
    return api.post('/api/auth/phone/send', { phone });
  },

  async verifyPhoneOtp(phone: string, code: string) {
    const res = await api.post<AuthResponse>('/api/auth/phone/verify', {
      phone,
      code,
    });
    return res.data;
  },

  async logout() {
    await api.post('/api/auth/logout');
    await Storage.clear();
  },

  async fetchMe() {
    const res = await api.get<AuthResponse['user']>('/api/auth/me');
    return res.data;
  },

  async updateProfile(data: {
    name?: string;
    phone?: string | null;
    avatar?: string;
  }) {
    const res = await api.put<AuthResponse['user']>('/api/auth/me', data);
    return res.data;
  },

  async forgotPassword(email: string) {
    return api.post('/api/auth/forgot-password', { email });
  },

  async resetPassword(token: string, newPassword: string) {
    return api.post('/api/auth/reset-password', { token, newPassword });
  },

  async verifyEmail(token: string) {
    return api.post('/api/auth/verify-email', { token });
  },
};
```

---

## Auth Flow State Machine

### Zustand Store with State Transitions

```typescript
// stores/auth.store.ts
import { create } from 'zustand';
import { authAPI } from '@/api/auth';
import { Storage } from '@/lib/storage';

interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: 'client' | 'provider';
  isVerified: boolean;
  avatar: string | null;
  phone: string | null;
}

type AuthState = 'initial' | 'loading' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthStore {
  // State
  state: AuthState;
  user: AuthUser | null;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  loginWithPhone: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  resetAuthState: () => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  state: 'initial',
  user: null,
  error: null,

  initialize: async () => {
    set({ state: 'loading' });
    try {
      const user = await authAPI.fetchMe();
      set({ user, state: 'authenticated', error: null });
    } catch (error) {
      set({ user: null, state: 'unauthenticated', error: null });
    }
  },

  login: async (email: string, password: string) => {
    set({ state: 'loading', error: null });
    try {
      const { user } = await authAPI.login({ email, password });
      set({ user, state: 'authenticated' });
    } catch (error: any) {
      const message = error.response?.data?.error || 'Login failed';
      set({ user: null, state: 'error', error: message });
      throw error;
    }
  },

  register: async (data) => {
    set({ state: 'loading', error: null });
    try {
      const { user } = await authAPI.register(data);
      set({ user, state: 'authenticated' });
    } catch (error: any) {
      const message = error.response?.data?.error || 'Registration failed';
      set({ user: null, state: 'error', error: message });
      throw error;
    }
  },

  loginWithPhone: async (phone: string) => {
    set({ state: 'loading', error: null });
    try {
      await authAPI.loginWithPhone(phone);
      // Wait for OTP verification (handled by verifyOtp)
      set({ state: 'loading' });
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to send OTP';
      set({ state: 'error', error: message });
      throw error;
    }
  },

  verifyOtp: async (phone: string, code: string) => {
    set({ state: 'loading', error: null });
    try {
      const { user } = await authAPI.verifyPhoneOtp(phone, code);
      set({ user, state: 'authenticated' });
    } catch (error: any) {
      const message = error.response?.data?.error || 'OTP verification failed';
      set({ state: 'error', error: message });
      throw error;
    }
  },

  logout: async () => {
    set({ state: 'loading' });
    try {
      await authAPI.logout();
      set({ user: null, state: 'unauthenticated', error: null });
    } catch (error: any) {
      console.error('Logout error:', error);
      // Force logout anyway
      set({ user: null, state: 'unauthenticated' });
    }
  },

  clearError: () => {
    set({ error: null });
    // Recover from error state if possible
    const currentState = get().state;
    if (currentState === 'error') {
      set({ state: get().user ? 'authenticated' : 'unauthenticated' });
    }
  },

  resetAuthState: () => {
    set({ state: 'initial', user: null, error: null });
  },
}));
```

---

## Authentication Screens

### Login Screen

```typescript
// screens/auth/Login.tsx
import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '@/stores/auth.store';
import { validateEmail } from '@/lib/validation';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { login, state, error } = useAuthStore();
  const isLoading = state === 'loading';

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      await login(email, password);
    } catch (err: any) {
      Alert.alert('Login Failed', err.response?.data?.error || 'An error occurred');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="bg-white"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 px-6 py-12">
          {/* Header */}
          <View className="mb-8">
            <Text className="text-4xl font-bold text-gray-900">Welcome Back</Text>
            <Text className="text-base text-gray-600 mt-2">
              Sign in to your LocalPro account
            </Text>
          </View>

          {/* Error Alert */}
          {error && (
            <View className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <Text className="text-red-700">{error}</Text>
            </View>
          )}

          {/* Email Field */}
          <View className="mb-6">
            <Text className="text-sm font-semibold text-gray-700 mb-2">Email</Text>
            <TextInput
              className={`border rounded-lg px-4 py-3 text-base ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="juan@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isLoading}
            />
            {errors.email && (
              <Text className="text-red-500 text-xs mt-1">{errors.email}</Text>
            )}
          </View>

          {/* Password Field */}
          <View className="mb-2">
            <Text className="text-sm font-semibold text-gray-700 mb-2">Password</Text>
            <TextInput
              className={`border rounded-lg px-4 py-3 text-base ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="••••••••"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              secureTextEntry
              editable={!isLoading}
            />
            {errors.password && (
              <Text className="text-red-500 text-xs mt-1">{errors.password}</Text>
            )}
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity
            className="mb-6"
            onPress={() => navigation.navigate('ForgotPassword')}
            disabled={isLoading}
          >
            <Text className="text-blue-600 text-sm font-semibold text-right">
              Forgot password?
            </Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            className={`rounded-lg py-3 flex-row items-center justify-center ${
              isLoading ? 'bg-blue-400' : 'bg-blue-600'
            }`}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" style={{ marginRight: 8 }} />
            ) : null}
            <Text className="text-white text-base font-semibold">
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          {/* Phone Login */}
          <TouchableOpacity
            className="mt-4 py-3 border border-gray-300 rounded-lg"
            onPress={() => navigation.navigate('PhoneLogin')}
            disabled={isLoading}
          >
            <Text className="text-gray-700 text-base font-semibold text-center">
              Sign in with Phone
            </Text>
          </TouchableOpacity>

          {/* Register Link */}
          <View className="flex-1 justify-end">
            <View className="flex-row justify-center gap-2">
              <Text className="text-gray-600">Don't have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text className="text-blue-600 font-semibold">Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
```

### Phone Login Screen

```typescript
// screens/auth/PhoneLogin.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '@/stores/auth.store';

type Step = 'phone' | 'otp';

export default function PhoneLoginScreen({ navigation }: any) {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const codeInputRef = useRef<TextInput>(null);

  const { loginWithPhone, verifyOtp } = useAuthStore();

  // Countdown timer for resend
  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const formatPhone = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.startsWith('63')) {
      return `+${cleaned}`;
    }
    return `+63${cleaned.substring(1)}`;
  };

  const handleSendOtp = async () => {
    if (!phone.replace(/\D/g, '').match(/^639\d{9}$|^\+639\d{9}$/)) {
      Alert.alert('Invalid Number', 'Please enter a valid Philippine phone number');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithPhone(formatPhone(phone));
      setStep('otp');
      setTimer(60);
      codeInputRef.current?.focus();
      Alert.alert('OTP Sent', `We sent a 6-digit code to ${formatPhone(phone)}`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit code');
      return;
    }

    setIsLoading(true);
    try {
      await verifyOtp(formatPhone(phone), code);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Invalid OTP code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1"
    >
      <View className="flex-1 px-6 py-12 bg-white">
        {/* Header */}
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-6">
          <Text className="text-blue-600 font-semibold">← Back</Text>
        </TouchableOpacity>

        <View className="mb-8">
          <Text className="text-3xl font-bold text-gray-900">Phone Sign In</Text>
          <Text className="text-base text-gray-600 mt-2">
            Fast and secure login with your phone number
          </Text>
        </View>

        {step === 'phone' ? (
          // Phone Entry
          <>
            <View className="mb-6">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Phone Number
              </Text>
              <View className="flex-row border border-gray-300 rounded-lg overflow-hidden">
                <View className="bg-gray-100 px-3 py-3 justify-center">
                  <Text className="text-gray-700 font-semibold">🇵🇭 +63</Text>
                </View>
                <TextInput
                  className="flex-1 px-4 py-3"
                  placeholder="917 123 4567"
                  value={phone.replace(/^\+?63/, '')}
                  onChangeText={(text) => setPhone(text)}
                  keyboardType="phone-pad"
                  editable={!isLoading}
                />
              </View>
              <Text className="text-xs text-gray-500 mt-2">
                We'll send a code to verify your number
              </Text>
            </View>

            <TouchableOpacity
              className={`rounded-lg py-3 ${isLoading ? 'bg-blue-400' : 'bg-blue-600'}`}
              onPress={handleSendOtp}
              disabled={isLoading || !phone}
            >
              <Text className="text-white text-base font-semibold text-center">
                {isLoading ? 'Sending...' : 'Send OTP Code'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          // OTP Verification
          <>
            <View className="mb-8">
              <Text className="text-base text-gray-600">
                We sent a 6-digit code to:
              </Text>
              <Text className="text-lg font-semibold text-gray-900 mt-1">
                {formatPhone(phone)}
              </Text>
            </View>

            <View className="mb-6">
              <Text className="text-sm font-semibold text-gray-700 mb-2">
                Verification Code
              </Text>
              <TextInput
                ref={codeInputRef}
                className="border border-gray-300 rounded-lg px-4 py-4 text-2xl text-center tracking-widest font-mono"
                placeholder="000000"
                value={code}
                onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                editable={!isLoading}
              />
            </View>

            <TouchableOpacity
              className={`rounded-lg py-3 mb-4 ${isLoading ? 'bg-blue-400' : 'bg-blue-600'}`}
              onPress={handleVerifyOtp}
              disabled={isLoading || code.length !== 6}
            >
              <Text className="text-white text-base font-semibold text-center">
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </Text>
            </TouchableOpacity>

            {/* Resend Code */}
            <TouchableOpacity
              onPress={() => {
                setCode('');
                setTimer(0);
                handleSendOtp();
              }}
              disabled={timer > 0 || isLoading}
              className="py-2"
            >
              <Text className={`text-center font-semibold ${
                timer > 0 ? 'text-gray-400' : 'text-blue-600'
              }`}>
                {timer > 0 ? `Resend code in ${timer}s` : 'Resend code'}
              </Text>
            </TouchableOpacity>

            {/* Change Number */}
            <TouchableOpacity
              onPress={() => {
                setStep('phone');
                setCode('');
                setTimer(0);
              }}
              className="mt-4 py-2"
            >
              <Text className="text-center text-gray-600">
                Wrong number? <Text className="text-blue-600 font-semibold">Change it</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
```

---

## Deep Link Handling

### Setup Deep Links

**Android:**
```xml
<!-- AndroidManifest.xml -->
<activity
    android:name=".MainActivity"
    android:launchMode="singleTask">
    <intent-filter android:label="@string/app_name">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        
        <!-- Email Verification -->
        <data
            android:scheme="https"
            android:host="localpro.io"
            android:pathPrefix="/verify-email" />
        
        <!-- Password Reset -->
        <data
            android:scheme="https"
            android:host="localpro.io"
            android:pathPrefix="/reset-password" />
    </intent-filter>
</activity>
```

**iOS (Info.plist):**
```xml
<key>CFBundleURLTypes</key>
<array>
    <dict>
        <key>CFBundleURLSchemes</key>
        <array>
            <string>localpro</string>
        </array>
        <key>CFBundleURLName</key>
        <string>com.localpro.mobile</string>
    </dict>
</array>
```

**React Native:**
```typescript
// lib/deeplinks.ts
import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';

const prefix = Linking.createURL('/');

export const linking = {
  prefixes: [prefix, 'https://localpro.io/', 'localpro://'],
  config: {
    screens: {
      VerifyEmail: 'verify-email/:token',
      ResetPassword: 'reset-password/:token',
      PhoneCallback: 'phone-callback/:code',
    },
  },
};

export function useDeepLink() {
  const navigation = useNavigation<any>();

  useEffect(() => {
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Handle deep link when app is opened from cold state
    Linking.getInitialURL().then((url) => {
      if (url != null) {
        handleDeepLink({ url });
      }
    });

    return () => subscription.remove();
  }, []);

  function handleDeepLink({ url }: { url: string }) {
    const route = url.replace(/.*?:\/\//g, '');
    const routeName = route.split('/')[0];
    const params = route.split('/').slice(1);

    if (routeName === 'verify-email') {
      navigation.navigate('VerifyEmail', { token: params[0] });
    } else if (routeName === 'reset-password') {
      navigation.navigate('ResetPassword', { token: params[0] });
    }
  }
}
```

### Email Verification Screen

```typescript
// screens/auth/VerifyEmail.tsx
import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { authAPI } from '@/api/auth';

export default function VerifyEmailScreen({ route, navigation }: any) {
  const { token } = route.params;

  useEffect(() => {
    verifyEmail();
  }, [token]);

  async function verifyEmail() {
    try {
      await authAPI.verifyEmail(token);
      
      // Delay for UX
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      navigation.replace('Login', {
        message: 'Email verified! You can now log in.',
      });
    } catch (error: any) {
      navigation.replace('Login', {
        error: error.response?.data?.error || 'Email verification failed',
      });
    }
  }

  return (
    <View className="flex-1 items-center justify-center bg-white">
      <ActivityIndicator size="large" color="#2563eb" />
      <Text className="mt-4 text-gray-600">Verifying your email...</Text>
    </View>
  );
}
```

---

## Session Management

### Session Monitor

```typescript
// lib/sessionManager.ts
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore } from '@/stores/auth.store';
import { Storage } from './storage';

const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes

export function useSessionManager() {
  const appState = useRef(AppState.currentState);
  const { user, logout } = useAuthStore();
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleAppStateChange(nextAppState: AppStateStatus) {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App has come to foreground
      if (user) {
        // Check if session expired
        checkSessionTimeout();
      }
    } else if (nextAppState.match(/inactive|background/)) {
      // App is backgrounding - set timeout
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (user) logout();
      }, SESSION_TIMEOUT);
    }

    appState.current = nextAppState;
  }

  async function checkSessionTimeout() {
    try {
      // Verify session is still valid
      await authAPI.fetchMe();
    } catch (error) {
      // Session expired
      logout();
    }
  }
}
```

---

## Token Refresh Strategy

### Automatic Token Refresh

```typescript
// Middleware in api/client.ts already handles this
// But here's the explicit strategy:

let isRefreshing = false;
let failedQueue: ((token: string) => void)[] = [];

const processQueue = (token: string) => {
  failedQueue.forEach(prom => prom(token));
  failedQueue = [];
};

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Wait for refresh to complete
        return new Promise(resolve => {
          failedQueue.push((token: string) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post('/api/auth/refresh');
        isRefreshing = false;
        processQueue('');
        return api(originalRequest);
      } catch (err) {
        isRefreshing = false;
        failedQueue = [];
        await logout();
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);
```

---

## Biometric Authentication

### iOS Biometric Login

```swift
import LocalAuthentication

class BiometricAuth {
    static let shared = BiometricAuth()
    
    func canUseBiometric() -> Bool {
        let context = LAContext()
        var error: NSError?
        return context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
    }
    
    func getBiometricType() -> String {
        let context = LAContext()
        _ = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
        
        if #available(iOS 11, *) {
            switch context.biometryType {
            case .faceID:
                return "Face ID"
            case .touchID:
                return "Touch ID"
            case .none:
                return "None"
            @unknown default:
                return "Unknown"
            }
        }
        return "Touch ID"
    }
    
    func authenticate(completion: @escaping (Result<Void, Error>) -> Void) {
        let context = LAContext()
        var error: NSError?
        
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            completion(.failure(error ?? NSError(domain: "", code: -1)))
            return
        }
        
        context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics,
                              localizedReason: "Sign in to LocalPro") { success, error in
            DispatchQueue.main.async {
                if success {
                    completion(.success(()))
                } else {
                    completion(.failure(error ?? NSError(domain: "", code: -1)))
                }
            }
        }
    }
}
```

### React Native Biometric

```typescript
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

export async function setupBiometric() {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return compatible && enrolled;
}

export async function authenticateWithBiometric() {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      disableDeviceFallback: false,
      reason: 'Sign in to LocalPro',
    });
    return result.success;
  } catch (error) {
    console.error('Biometric auth failed:', error);
    return false;
  }
}

export async function enableBiometric(password: string) {
  const available = await setupBiometric();
  if (!available) {
    throw new Error('Biometric not available');
  }

  // Verify password before enabling
  try {
    await api.post('/api/auth/login', {
      email: userEmail,
      password: password,
    });

    // Store password securely
    await SecureStore.setItemAsync('biometric_password', password);
    return true;
  } catch (error) {
    throw error;
  }
}

export async function loginWithBiometric(email: string) {
  const isAuthenticated = await authenticateWithBiometric();
  if (!isAuthenticated) {
    throw new Error('Biometric authentication failed');
  }

  const password = await SecureStore.getItemAsync('biometric_password');
  if (!password) {
    throw new Error('No biometric data available');
  }

  return api.post('/api/auth/login', { email, password });
}
```

---

## Testing Auth Flows

### Unit Tests (Jest)

```typescript
// __tests__/auth.test.ts
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuthStore } from '@/stores/auth.store';
import * as authAPI from '@/api/auth';

jest.mock('@/api/auth');

describe('Auth Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('initializes with unauthenticated state', () => {
    const { result } = renderHook(() => useAuthStore());
    expect(result.current.state).toBe('initial');
    expect(result.current.user).toBeNull();
  });

  test('successful login transitions to authenticated', async () => {
    const mockUser = {
      _id: '123',
      name: 'Test User',
      email: 'test@example.com',
      role: 'client',
      isVerified: true,
      avatar: null,
      phone: null,
    };

    (authAPI.login as jest.Mock).mockResolvedValue({ user: mockUser });

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    expect(result.current.state).toBe('authenticated');
    expect(result.current.user).toEqual(mockUser);
  });

  test('failed login sets error state', async () => {
    (authAPI.login as jest.Mock).mockRejectedValue({
      response: { data: { error: 'Invalid credentials' } },
    });

    const { result } = renderHook(() => useAuthStore());

    await act(async () => {
      try {
        await result.current.login('test@example.com', 'wrongpassword');
      } catch (error) {
        // Expected
      }
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error).toBe('Invalid credentials');
  });

  test('logout clears user data', async () => {
    const { result } = renderHook(() => useAuthStore());

    // Set authenticated state
    act(() => {
      result.current.setUser({ _id: '123', name: 'Test' } as any);
    });

    expect(result.current.user).not.toBeNull();

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.state).toBe('unauthenticated');
    expect(result.current.user).toBeNull();
  });
});
```

### Integration Tests (Detox)

```typescript
// e2e/auth.e2e.ts
describe('Authentication Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should complete phone login flow', async () => {
    // Navigate to login
    await element(by.text('Sign in with Phone')).tap();

    // Enter phone number
    await element(by.id('phoneInput')).typeText('9171234567');
    await element(by.text('Send OTP Code')).tap();

    // Wait for OTP screen
    await waitFor(element(by.text('Verification Code')))
      .toBeVisible()
      .withTimeout(5000);

    // Enter OTP (use hardcoded test OTP)
    await element(by.id('otpInput')).typeText('000000');
    await element(by.text('Verify Code')).tap();

    // Should navigate to home screen
    await waitFor(element(by.text('Home')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should handle invalid credentials', async () => {
    await element(by.id('emailInput')).typeText('test@example.com');
    await element(by.id('passwordInput')).typeText('wrongpassword');
    await element(by.text('Sign In')).tap();

    await waitFor(element(by.text(/Invalid email or password/i)))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should logout successfully', async () => {
    // Login first
    await loginHelper();

    // Navigate to profile
    await element(by.id('profileTab')).tap();

    // Logout
    await element(by.text('Logout')).tap();
    await element(by.text('Yes, log out')).tap();

    // Should return to login screen
    await waitFor(element(by.text('Welcome Back')))
      .toBeVisible()
      .withTimeout(5000);
  });
});

// Helper function
async function loginHelper() {
  await element(by.id('emailInput')).typeText('test@example.com');
  await element(by.id('passwordInput')).typeText('Test@123');
  await element(by.text('Sign In')).tap();

  await waitFor(element(by.text('Home')))
    .toBeVisible()
    .withTimeout(5000);
}
```

---

## Checklist

Use this to ensure your implementation is complete:

- [ ] Secure storage configured (Keychain/SecurePreferences)
- [ ] API client with CSRF interceptor
- [ ] Auth store with state machine
- [ ] Login screen implemented
- [ ] Phone login with OTP
- [ ] Registration flow
- [ ] Deep link handling for email verification
- [ ] Password reset flow
- [ ] Session management & timeout
- [ ] Token refresh logic
- [ ] Biometric authentication
- [ ] Error handling
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Logout functionality
- [ ] Profile management screens

---

**Need Help?**  
Reference: [MOBILE_AUTH_COMPREHENSIVE_GUIDE.md](MOBILE_AUTH_COMPREHENSIVE_GUIDE.md)  
API Docs: [mobile-auth-me-api.md](mobile-auth-me-api.md)
