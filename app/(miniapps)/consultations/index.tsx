import { router } from 'expo-router';
import { View } from 'react-native';

import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState';

export default function ConsultationsIndexScreen() {
  return (
    <View className="flex-1 bg-[#eef2f7] px-4 dark:bg-neutral-950">
      <FeatureEmptyState
        variant="full"
        icon="medical-services"
        title="Consultations"
        description="Book a consultation with a qualified professional. This flow will connect to the consultations API."
        primaryAction={{
          label: 'Request consultation',
          onPress: () => router.push('/consultations/new' as never),
          accessibilityLabel: 'Request a new consultation',
        }}
      />
    </View>
  );
}
