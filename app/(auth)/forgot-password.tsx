import { useState } from 'react';
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
import { isValidEmail } from '@/core/lib/validation';
import { getApiErrorMessage } from '@/core/utils/apiError';

export default function ForgotPasswordScreen() {
  const showToast = useToastStore((s) => s.show);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    if (!isValidEmail(email)) {
      showToast('Enter a valid email', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await authService.forgotPassword(email.trim());
      showToast(res.message ?? 'If an account exists, you will receive an email.');
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Could not send reset email'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreenLayout>
      <AuthBrandHeader />
      <AuthHeading
        title="Forgot password"
        subtitle="Enter the email on your account and we will send you a reset link."
      />

      <AuthFormCard>
        <AuthField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <AuthPrimaryButton className="mt-6" title="Send reset link" loading={busy} onPress={() => void onSubmit()} />
      </AuthFormCard>

      <View className="mt-4 items-center">
        <AuthTextLink href="/login">Back to sign in</AuthTextLink>
      </View>
    </AuthScreenLayout>
  );
}
