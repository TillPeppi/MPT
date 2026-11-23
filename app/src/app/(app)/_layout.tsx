import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

export default function AppLayout() {
  const { c, name } = useTheme();
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, statusBarStyle: name === 'dark' ? 'light' : 'dark' }} />;
}
