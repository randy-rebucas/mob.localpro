import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AuthBrandHeader } from '@/components/auth/AuthBrandHeader';
import { AuthField } from '@/components/auth/AuthField';
import { AuthFormCard } from '@/components/auth/AuthFormCard';
import { AuthHeading } from '@/components/auth/AuthHeading';
import { AuthPrimaryButton } from '@/components/auth/AuthPrimaryButton';
import { AuthScreenLayout } from '@/components/auth/AuthScreenLayout';
import { AuthTextLink } from '@/components/auth/AuthTextLink';
import { BRAND } from '@/constants/brand';
import { authService } from '@/core/services/authService';
import { useToastStore } from '@/core/stores/toastStore';
import { isValidEmail } from '@/core/lib/validation';
import { getApiErrorMessage } from '@/core/utils/apiError';

export default function LoginScreen() {
  const showToast = useToastStore((s) => s.show);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!isValidEmail(email)) {
      showToast('Enter a valid email', 'error');
      return;
    }
    if (!password) {
      showToast('Enter your password', 'error');
      return;
    }
    setBusy(true);
    try {
      await authService.login(email.trim(), password);
      showToast('Signed in');
      router.replace('/(tabs)');
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Sign in failed'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreenLayout>
      <AuthBrandHeader />
      <AuthHeading title="Sign in" subtitle="Welcome back — use your LocalPro email and password." />

      <AuthFormCard>
        <View className="gap-4">
          <AuthField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <AuthField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />
        </View>
        <AuthPrimaryButton className="mt-6" title="Continue" loading={busy} onPress={() => void onSubmit()} />
      </AuthFormCard>

      <View className="mt-2 items-center">
        <AuthTextLink href="/forgot-password">Forgot password?</AuthTextLink>
        <AuthTextLink href="/phone">Sign in with phone</AuthTextLink>
      </View>

      <View className="mt-10 flex-row flex-wrap items-center justify-center gap-x-1.5 pb-1">
        <Text className="text-[15px] text-neutral-600 dark:text-neutral-400">New here?</Text>
        <Link href="/register" asChild>
          <Pressable hitSlop={10} className="active:opacity-65">
            <Text style={{ color: BRAND.green }} className="text-[15px] font-semibold">
              Create an account
            </Text>
          </Pressable>
        </Link>
      </View>
    </AuthScreenLayout>
  );
}
