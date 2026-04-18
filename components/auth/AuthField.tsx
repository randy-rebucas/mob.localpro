import { Text, TextInput, type TextInputProps, View } from 'react-native';

type Props = TextInputProps & {
  label: string;
  /** Smaller mono font for tokens. */
  mono?: boolean;
};

export function AuthField({ label, mono, className, ...rest }: Props) {
  return (
    <View>
      <Text className="mb-2 text-[13px] font-semibold tracking-wide text-neutral-600 dark:text-neutral-400">{label}</Text>
      <TextInput
        placeholderTextColor="#94a3b8"
        className={`rounded-2xl border border-neutral-200 bg-neutral-50/95 px-4 py-3.5 text-[16px] text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-100 ${
          mono ? 'font-mono text-[14px]' : ''
        } ${className ?? ''}`}
        {...rest}
      />
    </View>
  );
}
