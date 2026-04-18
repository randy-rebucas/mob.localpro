import { Link } from 'expo-router';
import { Text, View } from 'react-native';

export default function ModalScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white px-6 dark:bg-neutral-950">
      <Text className="text-center text-2xl font-bold text-neutral-900 dark:text-neutral-50">LocalPro</Text>
      <Text className="mt-3 text-center text-sm leading-5 text-neutral-600 dark:text-neutral-400">
        Super-app shell with mini apps, shared auth, payments, and messaging services.
      </Text>
      <Link href="/" dismissTo style={{ marginTop: 24, paddingVertical: 12 }}>
        <Text className="text-base font-semibold text-brand dark:text-brand-muted">Back to home</Text>
      </Link>
    </View>
  );
}
