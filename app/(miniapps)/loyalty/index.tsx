import { Text, View } from 'react-native';

export default function LoyaltyScreen() {
  return (
    <View className="flex-1 justify-center bg-neutral-50 px-6 dark:bg-neutral-950">
      <Text className="text-center text-lg font-semibold text-neutral-900 dark:text-neutral-50">Points & tiers</Text>
      <Text className="mt-3 text-center text-sm text-neutral-600 dark:text-neutral-400">Referrals and rewards connect here.</Text>
    </View>
  );
}
