import { Stack } from 'expo-router';

import { useUi } from '@/store/ui';
import { useTheme } from '@/theme';

export default function AppLayout() {
  const { c, name } = useTheme();
  const override = useUi((s) => s.statusOverride);
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg }, statusBarStyle: override ?? (name === 'dark' ? 'light' : 'dark') }}
    />
  );
}
