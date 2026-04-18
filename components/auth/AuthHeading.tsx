import { Text, View } from 'react-native';

type Props = {
  title: string;
  subtitle: string;
};

export function AuthHeading({ title, subtitle }: Props) {
  return (
    <View className="mt-1">
      <Text className="text-[28px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{title}</Text>
      <Text className="mt-2 text-[15px] leading-[22px] text-neutral-600 dark:text-neutral-400">{subtitle}</Text>
    </View>
  );
}
