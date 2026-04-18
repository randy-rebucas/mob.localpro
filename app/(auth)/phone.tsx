import { router } from 'expo-router';
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
import { getApiErrorMessage } from '@/core/utils/apiError';

export default function PhoneAuthScreen() {
  const showToast = useToastStore((s) => s.show);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [busy, setBusy] = useState(false);

  async function sendOtp() {
    const p = phone.trim();
    if (p.length < 10) {
      showToast('Enter a valid phone number with country code (e.g. +639…)', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await authService.sendPhoneOtp(p);
      showToast(res.message ?? 'OTP sent');
      setStep('code');
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Could not send OTP'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    const p = phone.trim();
    const c = code.trim();
    if (c.length < 4) {
      showToast('Enter the code we sent you', 'error');
      return;
    }
    setBusy(true);
    try {
      await authService.verifyPhoneOtp(p, c);
      showToast('Signed in');
      router.replace('/(tabs)');
    } catch (e) {
      showToast(getApiErrorMessage(e, 'Invalid code'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthScreenLayout>
      <AuthBrandHeader />
      <AuthHeading
        title="Phone sign-in"
        subtitle={step === 'phone' ? 'We will text you a one-time code.' : 'Enter the code we sent to your phone.'}
      />

      <AuthFormCard>
        <View className="gap-4">
          <AuthField
            label="Phone number"
            value={phone}
            onChangeText={setPhone}
            editable={step === 'phone'}
            autoCapitalize="none"
            keyboardType="phone-pad"
            placeholder="+639XXXXXXXXX"
          />
          {step === 'code' ? (
            <AuthField
              label="One-time code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={8}
              placeholder="123456"
            />
          ) : null}
        </View>
        {step === 'phone' ? (
          <AuthPrimaryButton className="mt-6" title="Send code" loading={busy} onPress={() => void sendOtp()} />
        ) : (
          <AuthPrimaryButton className="mt-6" title="Verify & sign in" loading={busy} onPress={() => void verifyOtp()} />
        )}
      </AuthFormCard>

      {step === 'code' ? (
        <Pressable accessibilityRole="button" onPress={() => setStep('phone')} hitSlop={12} className="mt-3 self-center py-2 active:opacity-65">
          <Text style={{ color: BRAND.green }} className="text-center text-[15px] font-semibold">
            Use a different number
          </Text>
        </Pressable>
      ) : null}

      <View className="mt-4 items-center">
        <AuthTextLink href="/login">Sign in with email instead</AuthTextLink>
      </View>
    </AuthScreenLayout>
  );
}
