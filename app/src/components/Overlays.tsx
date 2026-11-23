/** Toast (unten) und Push-Banner (oben) wie #toast/#push der Demo. */
import { BlurView } from 'expo-blur';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown, SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { go } from '@/lib/nav';
import { useApp } from '@/store/app';
import { useUi } from '@/store/ui';
import { font } from '@/theme';

import { Icon } from './Icon';
import { TAB_H } from './Screen';
import { Tap } from './Tap';
import { Txt } from './ui';

export function ToastHost() {
  const t = useUi((s) => s.toast);
  const ins = useSafeAreaInsets();
  useEffect(() => {
    if (!t) return;
    const h = setTimeout(() => useUi.setState({ toast: null }), 2400);
    return () => clearTimeout(h);
  }, [t]);
  if (!t) return null;
  return (
    <View pointerEvents="none" style={[styles.toastWrap, { bottom: TAB_H + ins.bottom + 18 }]}>
      <Animated.View key={t.id} entering={FadeInDown.duration(250)} exiting={FadeOutDown.duration(200)} style={styles.toast} accessibilityLiveRegion="polite" accessibilityRole="alert">
        <Icon name="check" size={16} color="#0a0a0b" />
        <Txt f="semibold" s={13} c="#0a0a0b" style={{ flexShrink: 1 }}>
          {t.text}
        </Txt>
      </Animated.View>
    </View>
  );
}

export function PushHost() {
  const p = useUi((s) => s.push);
  const ins = useSafeAreaInsets();
  useEffect(() => {
    if (!p) return;
    const h = setTimeout(() => useUi.setState({ push: null }), 5200);
    return () => clearTimeout(h);
  }, [p]);
  if (!p) return null;
  return (
    <View pointerEvents="box-none" style={[styles.pushWrap, { top: ins.top + 4 }]}>
      <Animated.View key={p.id} entering={SlideInUp.springify().damping(18)} exiting={SlideOutUp.duration(220)}>
        <Tap
          scaleTo={0.98}
          accessibilityRole="alert"
          accessibilityLabel={`${p.title}. ${p.text}`}
          onPress={() => {
            useUi.setState({ push: null });
            if (p.target) {
              useApp.getState().readByTarget(p.target);
              go(p.target);
            }
          }}
          style={styles.push}
        >
          <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(40,40,44,0.7)' }]} />
          <View style={styles.logo}>
            <Txt f="display" s={13} c="#fff">
              M<Txt f="display" s={13} c="#f2611d">P</Txt>T
            </Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt f="bold" s={13.5} c="#fff">
              {p.title}
            </Txt>
            <Txt s={13} lh={17.5} c="#e4e4e7">
              {p.text}
            </Txt>
          </View>
          <Txt s={11} c="#a1a1aa" style={{ fontFamily: font.regular }}>
            jetzt
          </Txt>
        </Tap>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  toastWrap: { position: 'absolute', left: 18, right: 18, alignItems: 'center', zIndex: 50 },
  toast: { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#f4f4f5', borderRadius: 14, paddingVertical: 11, paddingHorizontal: 16, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 15, shadowOffset: { width: 0, height: 10 } },
  pushWrap: { position: 'absolute', left: 10, right: 10, zIndex: 70 },
  push: { flexDirection: 'row', gap: 11, alignItems: 'flex-start', padding: 12, paddingHorizontal: 14, borderRadius: 22, overflow: 'hidden' },
  logo: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#0a0a0b', alignItems: 'center', justifyContent: 'center' },
});
