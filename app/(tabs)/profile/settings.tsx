import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, Switch, Text, View } from 'react-native';

import { BRAND } from '@/constants/brand';
import { profileService } from '@/core/services/profileService';
import type { NotificationPreferences } from '@/core/types/profile';
import { useToastStore } from '@/core/stores/toastStore';
import { getApiErrorMessage } from '@/core/utils/apiError';

function Row({
  label,
  subtitle,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View className="mb-3 flex-row items-center justify-between rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
      <View className="min-w-0 flex-1 pr-3">
        <Text className="text-base font-medium text-neutral-900 dark:text-neutral-50">{label}</Text>
        {subtitle ? <Text className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} trackColor={{ true: BRAND.navy }} />
    </View>
  );
}

export default function ProfileSettingsScreen() {
  const qc = useQueryClient();
  const showToast = useToastStore((s) => s.show);

  const prefsQuery = useQuery({
    queryKey: ['profile', 'preferences'],
    queryFn: () => profileService.getPreferences(),
  });

  const updateMutation = useMutation({
    mutationFn: (patch: Partial<NotificationPreferences>) => profileService.updatePreferences(patch),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['profile', 'preferences'] });
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Could not update'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => profileService.requestDataDeletion(),
    onSuccess: (res) => showToast(res.message ?? 'Request submitted'),
    onError: (e) => showToast(getApiErrorMessage(e, 'Request failed'), 'error'),
  });

  const exportMutation = useMutation({
    mutationFn: () => profileService.exportPersonalData(),
    onSuccess: async (data) => {
      showToast('Export ready');
      const text = JSON.stringify(data, null, 2);
      try {
        await Share.share({ message: text.length > 14000 ? `${text.slice(0, 14000)}\n…(truncated)` : text });
      } catch {
        // user dismissed share sheet
      }
    },
    onError: (e) => showToast(getApiErrorMessage(e, 'Export failed'), 'error'),
  });

  if (prefsQuery.isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-[#eef2f7] dark:bg-neutral-950">
        <ActivityIndicator color={BRAND.navy} />
      </View>
    );
  }

  if (prefsQuery.isError) {
    return (
      <View className="flex-1 justify-center bg-[#eef2f7] px-6 dark:bg-neutral-950">
        <Text className="text-center text-sm text-neutral-600 dark:text-neutral-400">{getApiErrorMessage(prefsQuery.error)}</Text>
        <Pressable
          onPress={() => void prefsQuery.refetch()}
          className="mt-6 self-center rounded-2xl px-8 py-3"
          style={{ backgroundColor: BRAND.navy }}>
          <Text className="font-semibold text-white">Retry</Text>
        </Pressable>
      </View>
    );
  }

  const p = prefsQuery.data!;

  const busy = updateMutation.isPending;

  function patch(next: Partial<NotificationPreferences>) {
    updateMutation.mutate(next);
  }

  function patchCategory<K extends keyof NotificationPreferences['emailCategories']>(key: K, value: boolean) {
    patch({
      emailCategories: {
        ...p.emailCategories,
        [key]: value,
      },
    });
  }

  return (
    <ScrollView className="flex-1 bg-[#eef2f7] dark:bg-neutral-950" contentContainerClassName="px-5 pb-12 pt-4">
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Notifications</Text>
      <Row
        label="Email"
        subtitle="Job and account updates"
        value={p.emailNotifications}
        onValueChange={(v) => patch({ emailNotifications: v })}
        disabled={busy}
      />
      <Row
        label="Push"
        subtitle="In-app push where enabled"
        value={p.pushNotifications}
        onValueChange={(v) => patch({ pushNotifications: v })}
        disabled={busy}
      />
      <Row label="SMS" value={p.smsNotifications} onValueChange={(v) => patch({ smsNotifications: v })} disabled={busy} />
      <Row label="Marketing" value={p.marketingEmails} onValueChange={(v) => patch({ marketingEmails: v })} disabled={busy} />

      <Text className="mb-2 mt-8 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        Email categories
      </Text>
      <Row label="Job updates" value={p.emailCategories.jobUpdates} onValueChange={(v) => patchCategory('jobUpdates', v)} disabled={busy} />
      <Row label="Quote alerts" value={p.emailCategories.quoteAlerts} onValueChange={(v) => patchCategory('quoteAlerts', v)} disabled={busy} />
      <Row
        label="Payment alerts"
        value={p.emailCategories.paymentAlerts}
        onValueChange={(v) => patchCategory('paymentAlerts', v)}
        disabled={busy}
      />
      <Row label="Messages" value={p.emailCategories.messages} onValueChange={(v) => patchCategory('messages', v)} disabled={busy} />

      <Text className="mb-2 mt-8 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Privacy</Text>
      <Row
        label="Profile visible"
        subtitle="Let providers find you in discovery (when applicable)"
        value={p.profileVisible}
        onValueChange={(v) => patch({ profileVisible: v })}
        disabled={busy}
      />

      <Text className="mb-2 mt-10 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Your data</Text>
      <Pressable
        accessibilityRole="button"
        disabled={exportMutation.isPending}
        onPress={() => exportMutation.mutate()}
        className="mb-3 rounded-2xl border border-neutral-200 bg-white py-4 dark:border-neutral-800 dark:bg-neutral-900">
        {exportMutation.isPending ? (
          <ActivityIndicator color={BRAND.navy} />
        ) : (
          <Text className="text-center text-base font-semibold text-neutral-900 dark:text-neutral-50">Download my data (JSON)</Text>
        )}
      </Pressable>
      <Text className="mb-3 text-center text-[11px] leading-4 text-neutral-500 dark:text-neutral-400">
        Exports may be large. You can share to Files, email, or another app. Rate limits apply on the server.
      </Text>

      <Pressable
        accessibilityRole="button"
        disabled={deleteMutation.isPending}
        onPress={() => {
          Alert.alert(
            'Request account deletion',
            'This starts a privacy deletion workflow (up to 30 days). Continue?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Submit request',
                style: 'destructive',
                onPress: () => deleteMutation.mutate(),
              },
            ]
          );
        }}
        className="rounded-2xl border-2 border-red-200 bg-white py-4 dark:border-red-900/50 dark:bg-neutral-900">
        {deleteMutation.isPending ? (
          <ActivityIndicator color="#b91c1c" />
        ) : (
          <Text className="text-center text-base font-semibold text-red-700 dark:text-red-400">Request data deletion</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}
