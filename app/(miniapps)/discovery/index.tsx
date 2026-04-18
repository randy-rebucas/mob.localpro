import { router } from 'expo-router';
import { View } from 'react-native';

import { FeatureEmptyState } from '@/components/ui/FeatureEmptyState';

export default function DiscoveryIndexScreen() {
  return (
    <View className="flex-1 bg-[#eef2f7] px-4 dark:bg-neutral-950">
      <FeatureEmptyState
        variant="full"
        icon="travel-explore"
        title="Search providers"
        description="Filters and list UI connect to discovery APIs. Map uses Expo Location and React Native Maps."
        primaryAction={{
          label: 'Open map view',
          onPress: () => router.push('/discovery/map' as never),
          accessibilityLabel: 'Open provider map',
        }}
        secondaryAction={{
          label: 'Sample provider profile',
          onPress: () => router.push('/discovery/providers/demo-provider' as never),
          accessibilityLabel: 'Open sample provider profile',
        }}
      />
    </View>
  );
}
