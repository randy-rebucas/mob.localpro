import { type ReactNode } from 'react';
import { Platform, View } from 'react-native';

export function AuthFormCard({ children }: { children: ReactNode }) {
  return (
    <View
      className="mt-8 rounded-[26px] border border-neutral-200/80 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900"
      style={
        Platform.OS === 'ios'
          ? {
              shadowColor: '#0f172a',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.07,
              shadowRadius: 28,
            }
          : { elevation: 3 }
      }>
      {children}
    </View>
  );
}
