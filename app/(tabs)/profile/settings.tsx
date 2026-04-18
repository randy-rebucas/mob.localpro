import { Text, View } from 'react-native';

export default function ProfileSettingsScreen() {
  return (
    <View className="flex-1 justify-center bg-neutral-50 px-6 dark:bg-neutral-950">
      <Text className="text-center text-neutral-700 dark:text-neutral-300">App settings, privacy, and notifications toggles.</Text>
    </View>
  );
}
