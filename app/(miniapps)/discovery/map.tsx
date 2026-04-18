import { Text, View } from 'react-native';

export default function DiscoveryMapScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-neutral-100 px-6 dark:bg-neutral-900">
      <Text className="text-center text-base text-neutral-700 dark:text-neutral-300">
        Map placeholder: add `react-native-maps` + `expo-location` and render `MapView` here with provider pins from TanStack Query.
      </Text>
    </View>
  );
}
