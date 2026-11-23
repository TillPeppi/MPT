import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/TabBar';
import { useTheme } from '@/theme';

export default function TabLayout() {
  const { c } = useTheme();
  return (
    <Tabs tabBar={(p) => <TabBar {...p} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="stats" options={{ title: 'Statistik' }} />
      <Tabs.Screen name="book" options={{ title: 'Buchen' }} />
      <Tabs.Screen name="more" options={{ title: 'Mehr' }} />
    </Tabs>
  );
}
