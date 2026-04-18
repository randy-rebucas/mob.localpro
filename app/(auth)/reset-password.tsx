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

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const showToast = useToastStore((s) => s.show);
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const raw = params.token;
    const t = Array.isArray(raw) ? raw[0] : raw;
    if (t) setToken(t);
  }, [params.token]);

  async function onSubmit() {
    if (!token.trim()) {
      showToast('Paste the reset token from your email', 'error');
      return;
    }
    if (password.length < 8) {
      showToast('Use at least 8 characters', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await authService.resetPassword(token.trim(), password);
      showToast(res.message ?? 'Password updated');
      router.replace('/login');
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Could not reset password'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreenLayout>
      <AuthBrandHeader />
      <AuthHeading
        title="Reset password"
        subtitle="Paste the token from your email, then choose a new password."
      />

      <AuthFormCard>
        <View className="gap-4">
          <AuthField
            label="Reset token"
            mono
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="From your email"
          />
          <AuthField
            label="New password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="At least 8 characters"
          />
        </View>
        <AuthPrimaryButton className="mt-6" title="Update password" loading={busy} onPress={() => void onSubmit()} />
      </AuthFormCard>

      <View className="mt-4 items-center">
        <AuthTextLink href="/login">Back to sign in</AuthTextLink>
      </View>
    </AuthScreenLayout>
  );
}
