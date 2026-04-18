import { router } from 'expo-router';
import { View } from 'react-native';

import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState';

export default function RecurringIndexScreen() {
  return (
    <View className="flex-1 bg-[#eef2f7] px-4 dark:bg-neutral-950">
      <FeatureEmptyState
        variant="full"
        icon="event-repeat"
        title="Recurring services"
        description="Set up repeat visits for cleaning, maintenance, and more. Schedules will live here once the API is connected."
        primaryAction={{
          label: 'Open sample schedule',
          onPress: () => router.push('/recurring/sample-id' as never),
          accessibilityLabel: 'Open sample recurring schedule',
        }}
      />
    </View>
  );
}
