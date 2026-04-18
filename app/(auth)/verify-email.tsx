import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AuthBrandHeader } from '@/components/auth/AuthBrandHeader';
import { AuthField } from '@/components/auth/AuthField';
import { AuthFormCard } from '@/components/auth/AuthFormCard';
import { AuthHeading } from '@/components/auth/AuthHeading';
import { AuthPrimaryButton } from '@/components/auth/AuthPrimaryButton';
import { AuthScreenLayout } from '@/components/auth/AuthScreenLayout';
import { AuthTextLink } from '@/components/auth/AuthTextLink';
import { authService } from '@/core/services/authService';
import { useToastStore } from '@/core/stores/toastStore';
import { getApiErrorMessage } from '@/core/utils/apiError';

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const showToast = useToastStore((s) => s.show);
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const raw = params.token;
    const t = Array.isArray(raw) ? raw[0] : raw;
    if (t) setToken(t);
  }, [params.token]);

  async function onSubmit() {
    if (!token.trim()) {
      showToast('Enter the verification token', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await authService.verifyEmail(token.trim());
      showToast(res.message ?? 'Email verified');
      router.replace('/login');
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Verification failed'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreenLayout>
      <AuthBrandHeader />
      <AuthHeading
        title="Verify email"
        subtitle="Enter the token from your verification email, or open the link on this device."
      />

      <AuthFormCard>
        <AuthField
          label="Verification token"
          mono
          value={token}
          onChangeText={setToken}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Paste token here"
        />
        <AuthPrimaryButton className="mt-6" title="Verify email" loading={busy} onPress={() => void onSubmit()} />
      </AuthFormCard>

      <View className="mt-4 items-center">
        <AuthTextLink href="/login">Back to sign in</AuthTextLink>
      </View>
    </AuthScreenLayout>
  );
}
