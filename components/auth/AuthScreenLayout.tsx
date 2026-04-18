import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function AuthScreenLayout({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-[#eef2f7] dark:bg-neutral-950">
      <View
        pointerEvents="none"
        className="absolute left-0 right-0 top-0 h-[200px] rounded-b-[40px] bg-[#004b8d] opacity-[0.07] dark:opacity-[0.2]"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        style={{ paddingTop: Math.max(insets.top, 8) }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 22,
            paddingBottom: Math.max(insets.bottom, 28),
            paddingTop: 4,
          }}>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
