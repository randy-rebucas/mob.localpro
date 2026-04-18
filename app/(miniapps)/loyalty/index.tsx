import { View } from 'react-native';

import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState';

export default function LoyaltyScreen() {
  return (
    <View className="flex-1 bg-[#eef2f7] px-4 dark:bg-neutral-950">
      <FeatureEmptyState
        variant="full"
        icon="card-giftcard"
        title="Points & tiers"
        description="Referrals and rewards will connect here when the loyalty APIs are wired up."
      />
    </View>
  );
}
