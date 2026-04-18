import { Stack } from 'expo-router';

export default function WalletStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: 'Wallet' }} />
      <Stack.Screen name="transactions" options={{ title: 'Transactions' }} />
      <Stack.Screen name="topup" options={{ title: 'Add money' }} />
      <Stack.Screen name="withdraw" options={{ title: 'Withdraw' }} />
    </Stack>
  );
}
