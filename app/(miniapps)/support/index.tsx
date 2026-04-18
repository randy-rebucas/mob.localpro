import { View } from 'react-native';

import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState';

export default function SupportScreen() {
  return (
    <View className="flex-1 bg-[#eef2f7] px-4 dark:bg-neutral-950">
      <FeatureEmptyState
        variant="full"
        icon="support-agent"
        title="Support"
        description="Support chat and disputes reuse the messages service and real-time updates when connected to the API."
      />
    </View>
  );
}
