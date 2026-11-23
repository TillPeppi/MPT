/**
 * Screen-Gerüst: großer Titel im Inhalt, der beim Scrollen in eine halbtransparente
 * Leiste mit Blur wandert (.nav/.lt der Demo). Root-Screens zeigen Glocke + Profil.
 */
import { BlurView } from 'expo-blur';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming, Extrapolation, useDerivedValue, useReducedMotion, useAnimatedReaction } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { unread } from '@/lib/domain';
import { go } from '@/lib/nav';
import { useMember } from '@/store/app';
import { useTheme } from '@/theme';

import { Icon } from './Icon';
import { Tap } from './Tap';
import { Avatar, Disp, Txt } from './ui';

export const NAV_H = 52;
export const TAB_H = 58;

interface Props {
  title: string;
  sub?: string;
  /** Tab-Root: Glocke + Profil statt Zurück */
  root?: boolean;
  /** Pflicht-Ablauf: weder Zurück noch Tabbar */
  gate?: boolean;
  /** Großen Titel ausblenden (z. B. Foto-Hero auf Home) */
  noLargeTitle?: boolean;
  /** zusätzliche Aktionen rechts */
  extra?: ReactNode;
  children: ReactNode;
  /** Inhalt ohne Abstand oben (Foto-Hero hinter Statusleiste) */
  bleedTop?: boolean;
}

export function Screen({ title, sub, root, gate, noLargeTitle, extra, children, bleedTop }: Props) {
  const { c, name } = useTheme();
  const ins = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    y.value = e.contentOffset.y;
  });
  const scrolled = useDerivedValue(() => {
    const on = y.value > (bleedTop ? 260 : 40) ? 1 : 0;
    return reduce ? on : withTiming(on, { duration: 200 });
  });
  const bgStyle = useAnimatedStyle(() => ({ opacity: scrolled.value }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: scrolled.value,
    transform: [{ translateY: interpolate(scrolled.value, [0, 1], [6, 0], Extrapolation.CLAMP) }],
  }));
  // Über dem Foto-Hero ist die Statusleiste hell, sobald die Leiste erscheint wieder passend zum Theme.
  const [over, setOver] = useState(false);
  useAnimatedReaction(
    () => y.value > 260,
    (v, prev) => {
      if (bleedTop && v !== prev) scheduleOnRN(setOver, v);
    },
  );
  const navigation = useNavigation();
  useFocusEffect(
    useCallback(() => {
      if (!bleedTop) return;
      // Statusleiste gehört dem umgebenden Stack (react-native-screens).
      const parent = navigation.getParent();
      parent?.setOptions({ statusBarStyle: over && name === 'light' ? 'dark' : 'light' });
      return () => parent?.setOptions({ statusBarStyle: name === 'dark' ? 'light' : 'dark' });
    }, [bleedTop, over, name, navigation]),
  );
  const top = ins.top + NAV_H;
  const tabbar = root && !gate ? TAB_H + ins.bottom : 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: bleedTop ? 0 : top, paddingBottom: tabbar + 32, paddingHorizontal: 20, gap: 14 }}
        keyboardShouldPersistTaps="handled"
      >
        {!noLargeTitle ? (
          <View style={{ paddingBottom: 6 }}>
            {sub ? (
              <Txt f="semibold" s={15} c={c.muted} style={{ marginBottom: 6 }}>
                {sub}
              </Txt>
            ) : null}
            <Disp s={40} lh={42} accessibilityRole="header">
              {title}
            </Disp>
          </View>
        ) : null}
        {children}
      </Animated.ScrollView>

      <View style={[styles.nav, { height: top, paddingTop: ins.top }]} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, bgStyle, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line }]} pointerEvents="none">
          <BlurView intensity={40} tint={name === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: c.tab }]} />
        </Animated.View>
        <View style={styles.side}>
          {!root && !gate ? (
            <Tap onPress={() => router.back()} style={[styles.rbtn, { backgroundColor: c.card, borderColor: c.line }]} accessibilityLabel="Zurück" hitSlop={6}>
              <Icon name="back" size={18} />
            </Tap>
          ) : null}
        </View>
        <Animated.View style={[styles.center, titleStyle]} pointerEvents="none">
          <Txt f="bold" s={16} numberOfLines={1}>
            {title}
          </Txt>
        </Animated.View>
        <View style={[styles.side, { alignItems: 'flex-end' }]}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            {extra}
            {root && !gate ? <RootActions /> : null}
          </View>
        </View>
      </View>
    </View>
  );
}

function RootActions() {
  const { c } = useTheme();
  const m = useMember();
  const n = unread(m);
  return (
    <>
      <Tap onPress={() => go('notifs')} style={[styles.rbtn, { backgroundColor: c.card, borderColor: c.line }]} accessibilityLabel={n ? `Neuigkeiten, ${n} ungelesen` : 'Neuigkeiten'}>
        <Icon name="bell" size={18} />
        {n ? <View style={[styles.dot, { backgroundColor: c.acc, borderColor: c.card }]} /> : null}
      </Tap>
      <Tap onPress={() => go('profile')} accessibilityLabel="Profil">
        <Avatar ini={m.user.ini} />
      </Tap>
    </>
  );
}

export function RoundButton({ icon, onPress, label, badge }: { icon: 'cart'; onPress: () => void; label: string; badge?: number }) {
  const { c } = useTheme();
  return (
    <Tap onPress={onPress} style={[styles.rbtn, { backgroundColor: c.card, borderColor: c.line }]} accessibilityLabel={label}>
      <Icon name={icon} size={18} />
      {badge ? (
        <View style={{ position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: c.acc, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center' }}>
          <Txt f="heavy" s={10} c={c.on}>
            {badge}
          </Txt>
        </View>
      ) : null}
    </Tap>
  );
}

const styles = StyleSheet.create({
  nav: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  side: { flex: 1 },
  center: { flexShrink: 1, maxWidth: 190, alignItems: 'center' },
  rbtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  dot: { position: 'absolute', top: 8, right: 9, width: 9, height: 9, borderRadius: 5, borderWidth: 2 },
});
