import { Stack } from 'expo-router';

export default function MiniAppsStackLayout() {
  return <Stack screenOptions={{ headerBackTitle: 'Back', headerShown: true }} />;
}
