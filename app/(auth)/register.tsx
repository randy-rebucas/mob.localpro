import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AuthBrandHeader } from '@/components/auth/AuthBrandHeader';
import { AuthField } from '@/components/auth/AuthField';
import { AuthFormCard } from '@/components/auth/AuthFormCard';
import { AuthHeading } from '@/components/auth/AuthHeading';
import { AuthPrimaryButton } from '@/components/auth/AuthPrimaryButton';
import { AuthScreenLayout } from '@/components/auth/AuthScreenLayout';
import { BRAND } from '@/constants/brand';
import { authService } from '@/core/services/authService';
import { useToastStore } from '@/core/stores/toastStore';
import { isValidEmail } from '@/core/lib/validation';
import { getApiErrorMessage } from '@/core/utils/apiError';

export default function RegisterScreen() {
  const showToast = useToastStore((s) => s.show);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (name.trim().length < 2) {
      showToast('Enter your name', 'error');
      return;
    }
    if (!isValidEmail(email)) {
      showToast('Enter a valid email', 'error');
      return;
    }
    if (password.length < 8) {
      showToast('Use at least 8 characters for your password', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await authService.register({
        name: name.trim(),
        email: email.trim(),
        password,
        role: 'client',
      });
      showToast(res.message ?? 'Account created');
      router.replace('/login');
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Registration failed'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreenLayout>
      <AuthBrandHeader />
      <AuthHeading
        title="Create account"
        subtitle="Set up your client profile to post jobs, message providers, and pay securely."
      />

      <AuthFormCard>
        <View className="gap-4">
          <AuthField label="Name" value={name} onChangeText={setName} placeholder="Your full name" autoCapitalize="words" />
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
            placeholder="At least 8 characters"
          />
        </View>
        <AuthPrimaryButton className="mt-6" title="Register" loading={busy} onPress={() => void onSubmit()} />
      </AuthFormCard>

      <View className="mt-10 flex-row flex-wrap items-center justify-center gap-x-1.5 pb-1">
        <Text className="text-[15px] text-neutral-600 dark:text-neutral-400">Already have an account?</Text>
        <Link href="/login" asChild>
          <Pressable hitSlop={10} className="active:opacity-65">
            <Text style={{ color: BRAND.green }} className="text-[15px] font-semibold">
              Sign in
            </Text>
          </Pressable>
        </Link>
      </View>
    </AuthScreenLayout>
  );
}
