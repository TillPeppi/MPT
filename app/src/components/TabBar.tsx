/** Tabbar Home/Statistik/Buchen/Mehr: transparent mit Blur, aktiver Tab orange. */
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';

import type { IconName } from '@/data/types';
import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { TAB_H } from './Screen';
import { Tap } from './Tap';
import { Txt } from './ui';

const TABS: Record<string, [IconName, string]> = {
  index: ['home', 'Home'],
  stats: ['chart', 'Statistik'],
  book: ['cal', 'Buchen'],
  more: ['more', 'Mehr'],
};

export function TabBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { c, name } = useTheme();
  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom, height: TAB_H + insets.bottom, borderTopColor: c.line }]} accessibilityRole="tablist">
      <BlurView intensity={40} tint={name === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c.tab }]} />
      {state.routes.map((route, i) => {
        const t = TABS[route.name];
        if (!t) return null;
        const focused = state.index === i;
        const color = focused ? c.acc : c.muted;
        return (
          <Tap
            key={route.key}
            scaleTo={0.9}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={t[1]}
            onPress={() => {
              const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !e.defaultPrevented) navigateToTab(route.key);
            }}
            style={styles.item}
          >
            <Icon name={t[0]} size={24} color={color} />
            <Txt f="semibold" s={10.5} c={color}>
              {t[1]}
            </Txt>
          </Tap>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', paddingHorizontal: 10, paddingTop: 9, borderTopWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  item: { flex: 1, alignItems: 'center', gap: 3 },
});
