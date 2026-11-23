import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

const APressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** Skalierung beim Drücken (Demo: .97, Tabbar .9) */
  scaleTo?: number;
};

/** Drückbares Element, das beim Drücken leicht skaliert (aus bei „Bewegung reduzieren"). */
export function Tap({ style, children, scaleTo = 0.97, disabled, onPressIn, onPressOut, ...rest }: Props) {
  const reduce = useReducedMotion();
  const s = useSharedValue(1);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <APressable
      accessibilityRole="button"
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        if (!reduce) s.set(withTiming(scaleTo, { duration: 90 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!reduce) s.set(withSpring(1, { damping: 15, stiffness: 300 }));
        onPressOut?.(e);
      }}
      style={[style, a, disabled ? { opacity: 0.35 } : null]}
    >
      {children}
    </APressable>
  );
}
