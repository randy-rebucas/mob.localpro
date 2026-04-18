import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

type Props = { children: ReactNode };
type State = { error: Error | null };

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[RootErrorBoundary]', error.message, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <View className="flex-1 items-center justify-center gap-4 bg-white px-6 dark:bg-neutral-950">
          <Text className="text-center text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Something went wrong
          </Text>
          <Text className="text-center text-sm text-neutral-600 dark:text-neutral-400">
            {this.state.error.message}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss error and try again"
            onPress={() => this.setState({ error: null })}
            className="rounded-xl bg-neutral-900 px-6 py-3 active:opacity-90 dark:bg-neutral-100">
            <Text className="font-semibold text-white dark:text-neutral-900">Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
